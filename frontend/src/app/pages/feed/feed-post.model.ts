export interface FeedPost {
  id: number | string;
  authorId: string;
  author: string;
  handle: string;
  initials: string;
  avatarTone: 'ember' | 'stone' | 'plum';
  game: string;
  title: string;
  message: string;
  timeLabel: string;
  createdAt: number;
  likes: number;
  liked: boolean;
  comments: number;
  art: 'underworld' | 'afterlight' | 'newdawn';
  imageUrl?: string;
}
