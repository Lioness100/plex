import { ChapterSource, MediaTagData } from './video.types';

export interface LibraryRootResponse {
  size: number;
  allowSync: boolean;
  art: string;
  content: string;
  identifier: string;
  mediaTagPrefix: string;
  mediaTagVersion: number;
  title1: string;
  title2: string;
  Directory: Directory[];
}

export interface Directory {
  key: string;
  title: string;
}

export interface SectionsResponse {
  size: number;
  allowSync: boolean;
  identifier: string;
  mediaTagPrefix: string;
  mediaTagVersion: number;
  title1: string;
  Directory: SectionsDirectory[];
}

export interface SectionsDirectory {
  allowSync: boolean;
  art: string;
  composite: string;
  filters: boolean;
  refreshing: boolean;
  thumb: string;
  key: string;
  type: string;
  title: string;
  agent: string;
  scanner: string;
  language: string;
  uuid: string;
  updatedAt: number;
  createdAt: number;
  scannedAt: number;
  content: boolean;
  directory: boolean;
  contentChangedAt: number;
  Location: Location[];
}

export interface Location {
  id: number;
  path: string;
}

export interface MediaItems {
  size: number;
  allowSync: boolean;
  art: string;
  identifier: string;
  librarySectionID: number;
  librarySectionTitle: string;
  librarySectionUUID: string;
  mediaTagPrefix: string;
  mediaTagVersion: number;
  thumb: string;
  title1: string;
  title2: string;
  viewGroup: string;
  viewMode: number;
  Metadata: MovieData[];
}

export interface MovieData {
  ratingKey: string;
  userRating?: number;
  audienceRating?: number;
  audienceRatingImage?: string;
  originalTitle?: string;
  key: string;
  guid: string;
  studio: string;
  type: string;
  title: string;
  titleSort?: string;
  librarySectionID?: number;
  contentRating: string;
  summary: string;
  rating: number;
  viewCount?: number;
  viewOffset?: number;
  lastViewedAt?: number;
  year: number;
  tagline?: string;
  thumb: string;
  art: string;
  duration: number;
  originallyAvailableAt: string;
  addedAt: number;
  updatedAt: number;
  chapterSource?: ChapterSource;
  primaryExtraKey: string;
  ratingImage: string;
  Media: Media[];
  Genre: MediaTag[];
  Director: MediaTag[];
  Writer: MediaTag[];
  Country: MediaTag[];
  Collection?: MediaTagData[];
  Role?: MediaTag[];
  Similar?: MediaTagData[];
  Producer?: MediaTagData[];
}

export interface MediaTag {
  tag: string;
}

export interface Media {
  id: number;
  duration: number;
  bitrate: number;
  videoProfile: string;
  Part: Part[];
}

export interface Part {
  id: number;
  key: string;
  duration: number;
  file: string;
  size: number;
  container: string;
  videoProfile: string;
}

export interface ShowData {
  ratingKey: string;
  key: string;
  guid: string;
  studio: string;
  type: string;
  title: string;
  librarySectionTitle: string;
  librarySectionID: number;
  librarySectionKey: string;
  contentRating: string;
  summary: string;
  index: number;
  rating: number;
  year: number;
  thumb: string;
  art: string;
  banner: string;
  theme: string;
  duration: number;
  originallyAvailableAt: string;
  leafCount: number;
  viewedLeafCount: number;
  childCount: number;
  addedAt: number;
  updatedAt: number;
  Genre: MediaTag[];
  Role: MediaTag[];
}
