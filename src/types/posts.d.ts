export interface Frontmatter {
  id: string;
  date: string;
  title?: string;
  description?: string;
  tags: string[];
  image?: string;
  alt?: string;
}

export interface Post {
  frontmatter: Frontmatter;
  content: string;
}
