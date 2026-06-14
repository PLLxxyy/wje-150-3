import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../utils/storage';
import { BookCard } from '../components/BookCard';
import type { Review } from '../types';

type MyTab = 'published' | 'holding' | 'history' | 'reviews';

export const MyBooks: React.FC = () => {
  const [tab, setTab] = useState<MyTab>('published');
  const navigate = useNavigate();
  const user = storage.getCurrentUser();
  const books = storage.getBooks();
  const records = storage.getRecords();
  const reviews = storage.getReviewsByUser(user.id);

  const published = useMemo(() => books.filter((b) => b.publisherId === user.id), [books, user.id]);

  const holding = useMemo(() => books.filter((b) => b.currentHolderId === user.id), [books, user.id]);

  const history = useMemo(() => {
    const bookIds = new Set(records.filter((r) => r.fromUser === user.id || r.toUser === user.id).map((r) => r.bookId));
    return books.filter((b) => bookIds.has(b.id));
  }, [books, records, user.id]);

  const reviewsWithBook = useMemo(() => {
    return reviews.map((review) => ({
      review,
      book: books.find((b) => b.id === review.bookId),
    })).filter((item): item is { review: Review; book: typeof books[0] } => item.book !== undefined);
  }, [reviews, books]);

  const currentList = tab === 'published' ? published : tab === 'holding' ? holding : tab === 'history' ? history : [];

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= rating ? 'filled' : ''}`} style={{ fontSize: 14 }}>
          ★
        </span>
      );
    }
    return <div className="rating-stars-display">{stars}</div>;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '20px 0 8px' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>个人中心</div>
          <div style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 2 }}>
            {user.nickname} · {user.city}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/publish')}>发布书籍</button>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'published' ? 'active' : ''}`} onClick={() => setTab('published')}>
          我发布的 ({published.length})
        </div>
        <div className={`tab ${tab === 'holding' ? 'active' : ''}`} onClick={() => setTab('holding')}>
          我手中的 ({holding.length})
        </div>
        <div className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          漂流历史 ({history.length})
        </div>
        <div className={`tab ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>
          我的评价 ({reviews.length})
        </div>
      </div>

      {tab === 'reviews' ? (
        reviewsWithBook.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⭐</div>
            <div className="empty-text">还没有写过评价</div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/')}>
              去发现好书
            </button>
          </div>
        ) : (
          <div className="rating-section" style={{ padding: 0 }}>
            {reviewsWithBook.map(({ review, book }) => (
              <div key={review.id} className="review-item" style={{ padding: 16 }} onClick={() => navigate(`/book/${book.id}`)}>
                <div style={{ display: 'flex', gap: 12, cursor: 'pointer' }}>
                  <div style={{ width: 60, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--gray-100)' }}>
                    {book.cover ? (
                      <img src={book.cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: 'linear-gradient(135deg, var(--primary-light), #ede9fe)' }}>
                        📚
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{book.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 6 }}>{book.author}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {renderStars(review.rating)}
                      <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{formatDate(review.timestamp)}</span>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {review.comment}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        currentList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{tab === 'published' ? '📖' : tab === 'holding' ? '🤲' : '📜'}</div>
            <div className="empty-text">
              {tab === 'published' ? '还没有发布过书籍' : tab === 'holding' ? '手中暂无书籍' : '暂无漂流历史'}
            </div>
            {tab === 'published' && (
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/publish')}>
                去发布
              </button>
            )}
          </div>
        ) : (
          <div className="book-grid">
            {currentList.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )
      )}
    </div>
  );
};
