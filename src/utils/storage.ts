import type { Book, DriftRecord, User, Review } from '../types';

const KEYS = {
  books: 'drift_books',
  records: 'drift_records',
  user: 'drift_current_user',
  seeded: 'drift_seeded',
  reviews: 'drift_reviews',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export const storage = {
  getBooks(): Book[] {
    return read<Book[]>(KEYS.books, []);
  },
  setBooks(books: Book[]): void {
    write(KEYS.books, books);
  },
  getBookById(id: string): Book | undefined {
    return this.getBooks().find((b) => b.id === id);
  },
  getBookByCode(code: string): Book | undefined {
    return this.getBooks().find((b) => b.driftCode === code);
  },
  addBook(book: Book): void {
    const books = this.getBooks();
    books.unshift(book);
    this.setBooks(books);
  },
  updateBook(id: string, patch: Partial<Book>): void {
    const books = this.getBooks().map((b) => (b.id === id ? { ...b, ...patch } : b));
    this.setBooks(books);
  },

  getRecords(): DriftRecord[] {
    return read<DriftRecord[]>(KEYS.records, []);
  },
  setRecords(records: DriftRecord[]): void {
    write(KEYS.records, records);
  },
  getRecordsByBook(bookId: string): DriftRecord[] {
    return this.getRecords().filter((r) => r.bookId === bookId).sort((a, b) => a.timestamp - b.timestamp);
  },
  addRecord(record: DriftRecord): void {
    const records = this.getRecords();
    records.push(record);
    this.setRecords(records);
  },

  getCurrentUser(): User {
    return read<User>(KEYS.user, { id: 'user-1', nickname: '书虫小明', city: '北京', avatar: '' });
  },
  setCurrentUser(user: User): void {
    write(KEYS.user, user);
  },

  isSeeded(): boolean {
    return localStorage.getItem(KEYS.seeded) === '1';
  },
  markSeeded(): void {
    localStorage.setItem(KEYS.seeded, '1');
  },

  getReviews(): Review[] {
    return read<Review[]>(KEYS.reviews, []);
  },
  setReviews(reviews: Review[]): void {
    write(KEYS.reviews, reviews);
  },
  getReviewsByBook(bookId: string): Review[] {
    return this.getReviews().filter((r) => r.bookId === bookId).sort((a, b) => b.timestamp - a.timestamp);
  },
  getReviewsByUser(userId: string): Review[] {
    return this.getReviews().filter((r) => r.userId === userId).sort((a, b) => b.timestamp - a.timestamp);
  },
  getReviewByUserAndBook(userId: string, bookId: string): Review | undefined {
    return this.getReviews().find((r) => r.userId === userId && r.bookId === bookId);
  },
  getAverageRating(bookId: string): number {
    const reviews = this.getReviewsByBook(bookId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  },
  addReview(review: Review): void {
    const reviews = this.getReviews();
    const existingIndex = reviews.findIndex((r) => r.userId === review.userId && r.bookId === review.bookId);
    if (existingIndex >= 0) {
      reviews[existingIndex] = review;
    } else {
      reviews.unshift(review);
    }
    this.setReviews(reviews);
  },
  deleteReview(reviewId: string): void {
    const reviews = this.getReviews().filter((r) => r.id !== reviewId);
    this.setReviews(reviews);
  },
};
