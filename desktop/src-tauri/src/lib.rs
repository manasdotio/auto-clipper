use tauri::{AppHandle, Emitter};
use std::io::{BufRead, BufReader, Read, Write, Seek, SeekFrom};
use std::process::{Command, Stdio};
use std::thread;
use std::net::{TcpListener, TcpStream};
use std::fs::File;
use std::path::Path;
use std::sync::atomic::{AtomicU16, Ordering};

static PORT: AtomicU16 = AtomicU16::new(0);

fn percent_encoding_decode(s: &str) -> Option<String> {
    let mut bytes = Vec::new();
    let mut chars = s.as_bytes().iter().copied();
    while let Some(b) = chars.next() {
        if b == b'%' {
            let h1 = chars.next()?;
            let h2 = chars.next()?;
            let hex = vec![h1, h2];
            let hex_str = std::str::from_utf8(&hex).ok()?;
            let hex_val = u8::from_str_radix(hex_str, 16).ok()?;
            bytes.push(hex_val);
        } else {
            bytes.push(b);
        }
    }
    String::from_utf8(bytes).ok()
}

fn handle_client(mut stream: TcpStream) {
    let mut buffer = [0; 4096];
    let bytes_read = match stream.read(&mut buffer) {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);
    let mut lines = request.lines();
    let request_line = match lines.next() {
        Some(line) => line,
        None => return,
    };
    
    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 || parts[0] != "GET" {
        return;
    }
    
    let url_path = parts[1];
    let mut decoded_path = match percent_encoding_decode(url_path) {
        Some(p) => p,
        None => return,
    };
    
    if decoded_path.starts_with('/') {
        if cfg!(windows) && decoded_path.chars().nth(2) == Some(':') {
            decoded_path.remove(0);
        }
    }
    
    let file_path = Path::new(&decoded_path);
    if !file_path.exists() || !file_path.is_file() {
        let response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(response.as_bytes());
        return;
    }
    
    let mut file = match File::open(&file_path) {
        Ok(f) => f,
        Err(_) => {
            let response = "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\n\r\n";
            let _ = stream.write_all(response.as_bytes());
            return;
        }
    };
    
    let file_len = match file.metadata() {
        Ok(m) => m.len(),
        Err(_) => return,
    };
    
    let mut range_start = 0;
    let mut range_end = None;
    let mut has_range = false;
    
    for line in lines {
        if line.to_lowercase().starts_with("range:") {
            if let Some(bytes_part) = line.split('=').nth(1) {
                let range_parts: Vec<&str> = bytes_part.split('-').collect();
                if !range_parts.is_empty() {
                    if let Ok(start) = range_parts[0].trim().parse::<u64>() {
                        range_start = start;
                        has_range = true;
                    }
                    if range_parts.len() > 1 && !range_parts[1].trim().is_empty() {
                        if let Ok(end) = range_parts[1].trim().parse::<u64>() {
                            range_end = Some(end);
                        }
                    }
                }
            }
        }
    }
    
    let start = range_start;
    let end = match range_end {
        Some(e) => std::cmp::min(e, file_len - 1),
        None => file_len - 1,
    };
    
    if start >= file_len {
        let response = format!(
            "HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */{}\r\nContent-Length: 0\r\n\r\n",
            file_len
        );
        let _ = stream.write_all(response.as_bytes());
        return;
    }
    
    let content_length = end - start + 1;
    
    if has_range {
        let headers = format!(
            "HTTP/1.1 206 Partial Content\r\n\
             Content-Type: video/mp4\r\n\
             Accept-Ranges: bytes\r\n\
             Content-Range: bytes {}-{}/{}\r\n\
             Content-Length: {}\r\n\
             Access-Control-Allow-Origin: *\r\n\
             Connection: close\r\n\r\n",
            start, end, file_len, content_length
        );
        if stream.write_all(headers.as_bytes()).is_err() {
            return;
        }
    } else {
        let headers = format!(
            "HTTP/1.1 200 OK\r\n\
             Content-Type: video/mp4\r\n\
             Accept-Ranges: bytes\r\n\
             Content-Length: {}\r\n\
             Access-Control-Allow-Origin: *\r\n\
             Connection: close\r\n\r\n",
            file_len
        );
        if stream.write_all(headers.as_bytes()).is_err() {
            return;
        }
    }
    
    if file.seek(SeekFrom::Start(start)).is_err() {
        return;
    }
    
    let mut file_buf = [0; 65536];
    let mut remaining = content_length;
    while remaining > 0 {
        let chunk_size = std::cmp::min(remaining, file_buf.len() as u64) as usize;
        match file.read_exact(&mut file_buf[..chunk_size]) {
            Ok(_) => {
                if stream.write_all(&file_buf[..chunk_size]).is_err() {
                    return;
                }
                remaining -= chunk_size as u64;
            }
            Err(_) => break,
        }
    }
}

fn start_local_server() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind local server");
    let port = listener.local_addr().unwrap().port();
    PORT.store(port, Ordering::Relaxed);
    
    thread::spawn(move || {
        for stream in listener.incoming() {
            if let Ok(stream) = stream {
                thread::spawn(move || {
                    handle_client(stream);
                });
            }
        }
    });
}

#[tauri::command]
fn get_video_url(path: String) -> String {
    let port = PORT.load(Ordering::Relaxed);
    let formatted_path = if path.starts_with('/') {
        path
    } else {
        format!("/{}", path.replace('\\', "/"))
    };
    format!("http://127.0.0.1:{}{}", port, formatted_path)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn check_ffmpeg_installed() -> bool {
    Command::new("ffmpeg")
        .arg("-version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn run_on_main_thread<F, R>(app: &AppHandle, f: F) -> R
where
    F: FnOnce() -> R + Send + 'static,
    R: Send + 'static,
{
    let (tx, rx) = std::sync::mpsc::channel();
    app.run_on_main_thread(move || {
        let res = f();
        let _ = tx.send(res);
    }).expect("Failed to run on main thread");
    rx.recv().expect("Failed to receive from main thread")
}

#[tauri::command]
fn select_video_file(app: AppHandle) -> Option<String> {
    run_on_main_thread(&app, || {
        rfd::FileDialog::new()
            .add_filter("Video Files", &["mp4", "mkv", "avi", "mov", "webm"])
            .pick_file()
            .map(|p| p.to_string_lossy().into_owned())
    })
}

#[tauri::command]
fn select_image_file(app: AppHandle) -> Option<String> {
    run_on_main_thread(&app, || {
        rfd::FileDialog::new()
            .add_filter("Image Files", &["png", "jpg", "jpeg", "webp"])
            .pick_file()
            .map(|p| p.to_string_lossy().into_owned())
    })
}

#[tauri::command]
fn select_audio_file(app: AppHandle) -> Option<String> {
    run_on_main_thread(&app, || {
        rfd::FileDialog::new()
            .add_filter("Audio Files", &["mp3", "wav", "m4a", "ogg", "aac"])
            .pick_file()
            .map(|p| p.to_string_lossy().into_owned())
    })
}

#[tauri::command]
fn select_srt_file(app: AppHandle) -> Option<String> {
    run_on_main_thread(&app, || {
        rfd::FileDialog::new()
            .add_filter("Subtitles", &["srt"])
            .pick_file()
            .map(|p| p.to_string_lossy().into_owned())
    })
}

#[tauri::command]
fn select_output_directory(app: AppHandle) -> Option<String> {
    run_on_main_thread(&app, || {
        rfd::FileDialog::new()
            .pick_folder()
            .map(|p| p.to_string_lossy().into_owned())
    })
}

#[tauri::command]
fn get_video_duration(path: String) -> Result<f64, String> {
    let output = Command::new("ffprobe")
        .arg("-v")
        .arg("error")
        .arg("-show_entries")
        .arg("format=duration")
        .arg("-of")
        .arg("default=noprint_wrappers=1:nokey=1")
        .arg(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }

    let duration_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    duration_str.parse::<f64>().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_video_dimensions(path: String) -> Result<(u32, u32), String> {
    let output = Command::new("ffprobe")
        .arg("-v")
        .arg("error")
        .arg("-select_streams")
        .arg("v:0")
        .arg("-show_entries")
        .arg("stream=width,height")
        .arg("-of")
        .arg("csv=s=x:p=0")
        .arg(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }

    let dims_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let parts: Vec<&str> = dims_str.split('x').collect();
    if parts.len() < 2 {
        return Err(format!("Invalid dimensions format: {}", dims_str));
    }

    let width = parts[0].parse::<u32>().map_err(|e| e.to_string())?;
    let height = parts[1].parse::<u32>().map_err(|e| e.to_string())?;
    Ok((width, height))
}

#[tauri::command]
fn check_audio_track(path: String) -> Result<bool, String> {
    let output = Command::new("ffprobe")
        .arg("-v")
        .arg("error")
        .arg("-select_streams")
        .arg("a:0")
        .arg("-show_entries")
        .arg("stream=codec_type")
        .arg("-of")
        .arg("default=noprint_wrappers=1:nokey=1")
        .arg(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).into_owned());
    }

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(!result.is_empty())
}

#[tauri::command]
async fn run_ffmpeg_command(app: AppHandle, args: Vec<String>) -> Result<String, String> {
    let mut child = Command::new("ffmpeg")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start FFmpeg: {}", e))?;

    let stderr = child.stderr.take().ok_or("Failed to open stderr")?;
    let app_handle_clone = app.clone();

    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_handle_clone.emit("ffmpeg-log", l);
            }
        }
    });

    let status = child.wait().map_err(|e| format!("Failed to wait on FFmpeg: {}", e))?;
    if status.success() {
        Ok("Success".to_string())
    } else {
        Err("FFmpeg exited with an error status".to_string())
    }
}

#[tauri::command]
fn get_font_path() -> String {
    let temp_dir = std::env::temp_dir();
    let font_path = temp_dir.join("Roboto-Regular.ttf");
    if !font_path.exists() {
        let bytes = include_bytes!("Roboto-Regular.ttf");
        let _ = std::fs::write(&font_path, bytes);
    }
    font_path.to_string_lossy().into_owned()
}

#[tauri::command]
fn read_and_delete_file(path: String) -> Result<Vec<u8>, String> {
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_file(&path);
    Ok(bytes)
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    std::fs::remove_file(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    std::fs::write(path, data).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    start_local_server();

    // Fix for Linux WebKitGtk driver heap crash ("corrupted double-linked list") on startup:
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            check_ffmpeg_installed,
            select_video_file,
            select_image_file,
            select_audio_file,
            select_srt_file,
            select_output_directory,
            get_video_duration,
            get_video_dimensions,
            check_audio_track,
            run_ffmpeg_command,
            get_font_path,
            read_and_delete_file,
            delete_file,
            read_text_file,
            write_binary_file,
            get_video_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
