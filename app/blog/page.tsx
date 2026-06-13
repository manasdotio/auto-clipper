import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog & Resources | Auto Clipper',
  description: 'Articles, tutorials, and guides on video editing, splitting, and content creation.',
};

export default function BlogHub() {
  const articles = [
    {
      title: "How to Split a Video Into Equal Parts (No Upload)",
      description: "A complete guide to dividing long videos into smaller, perfectly equal segments without waiting for cloud uploads.",
      href: "#",
      date: "May 20, 2026"
    },
    {
      title: "Best Free Video Splitters That Don't Upload Your Files",
      description: "Comparing the top client-side tools for video manipulation focused on user privacy and performance.",
      href: "#",
      date: "May 15, 2026"
    },
    {
      title: "How to Create TikTok Clips from Long Videos",
      description: "Repurpose your YouTube content or Twitch streams into highly engaging short-form content.",
      href: "#",
      date: "May 10, 2026"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-24 max-w-4xl">
      <h1 className="text-4xl font-extrabold mb-4 tracking-tight">Blog & Resources</h1>
      <p className="text-xl text-muted-foreground mb-12">Learn how to make the most out of your video content.</p>

      <div className="grid gap-8">
        {articles.map((article, i) => (
          <article key={i} className="p-6 bg-card border rounded-2xl transition-colors hover:bg-muted/50">
            <time className="text-sm text-muted-foreground block mb-2">{article.date}</time>
            <h2 className="text-2xl font-bold mb-3">
              <a href={article.href} className="hover:underline">{article.title}</a>
            </h2>
            <p className="text-muted-foreground">{article.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
