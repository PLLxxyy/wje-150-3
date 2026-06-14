import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../utils/storage';
import { id } from '../utils/seed';
import { useToast } from '../components/Toast';
import { DriftTimeline } from '../components/DriftTimeline';
import type { Review } from '../types';

const coverEmojis: Record<string, string> = {
  '文学': '📖', '科技': '💻', '生活': '🌿', '童书': '🧸',
  '社科': '🌍', '艺术': '🎨', '经管': '📊', '其他': '📚',
};

const statusClass: Record<string, string> = {
  '待漂流': 'tag-status-available',
  '漂流中': 'tag-status-drifting',
  '已归档': 'tag-status-archived',
};

export const BookDetail: React.FC = () => {
  const { id: bookId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const user = storage.getCurrentUser();

  const [showSendModal, setShowSendModal] = useState(false);
  const [targetNickname, setTargetNickname] = useState('');
  const [targetCity, setTargetCity] = useState('');

  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [myExistingReview, setMyExistingReview] = useState<Review | null>(null);

  const book = storage.getBookById(bookId || '');

  useEffect(() => {
    if (book) {
      refreshReviews();
    }
  }, [book?.id]);

  const refreshReviews = () => {
    if (!book) return;
    const allReviews = storage.getReviewsByBook(book.id);
    setReviews(allReviews);
    const mine = storage.getReviewByUserAndBook(user.id, book.id);
    setMyExistingReview(mine || null);
    if (mine) {
      setMyRating(mine.rating);
      setMyComment(mine.comment);
    }
  };

  const averageRating = book ? storage.getAverageRating(book.id) : 0;

  if (!book) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📚</div>
        <div className="empty-text">书籍不存在</div>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  const records = storage.getRecordsByBook(book.id);
  const isHolder = book.currentHolderId === user.id;
  const isPublisher = book.publisherId === user.id;
  const cities = [...new Set(records.map((r) => r.city))];

  const handleSubmitReview = () => {
    if (myRating === 0) {
      showToast('请选择评分', 'error');
      return;
    }
    if (!myComment.trim()) {
      showToast('请填写评价内容', 'error');
      return;
    }
    const now = Date.now();
    const review: Review = {
      id: myExistingReview?.id || id(),
      bookId: book.id,
      userId: user.id,
      nickname: user.nickname,
      rating: myRating,
      comment: myComment.trim(),
      timestamp: now,
    };
    storage.addReview(review);
    showToast(myExistingReview ? '评价已更新' : '评价成功', 'success');
    refreshReviews();
  };

  const handleDeleteReview = (reviewId: string) => {
    if (confirm('确定要删除这条评价吗？')) {
      storage.deleteReview(reviewId);
      showToast('评价已删除', 'success');
      setMyRating(0);
      setMyComment('');
      refreshReviews();
    }
  };

  const renderStars = (rating: number, interactive = false, size = 'normal') => {
    const stars = [];
    const starSize = size === 'small' ? '14px' : size === 'large' ? '28px' : '20px';
    for (let i = 1; i <= 5; i++) {
      const filled = i <= (hoverRating && interactive ? hoverRating : rating);
      const hover = interactive && i <= hoverRating;
      stars.push(
        <span
          key={i}
          className={`star ${filled ? 'filled' : ''} ${hover ? 'hover' : ''}`}
          style={{ fontSize: starSize }}
          onClick={interactive ? () => setMyRating(i) : undefined}
          onMouseEnter={interactive ? () => setHoverRating(i) : undefined}
          onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
        >
          ★
        </span>
      );
    }
    return <div className={interactive ? 'rating-input' : 'rating-stars-display'}>{stars}</div>;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (!targetNickname.trim()) { showToast('请输入对方昵称', 'error'); return; }
    if (!targetCity.trim()) { showToast('请输入对方城市', 'error'); return; }
    const now = Date.now();
    storage.addRecord({
      id: id(),
      bookId: book.id,
      action: '寄出',
      fromUser: user.id,
      fromNickname: user.nickname,
      toUser: `temp-${now}`,
      toNickname: targetNickname.trim(),
      city: user.city,
      timestamp: now,
    });
    storage.updateBook(book.id, { status: '漂流中', currentHolderId: `temp-${now}` });
    showToast('寄出成功！', 'success');
    setShowSendModal(false);
    setTargetNickname('');
    setTargetCity('');
  };

  const handleReceive = () => {
    const now = Date.now();
    storage.addRecord({
      id: id(),
      bookId: book.id,
      action: '收到',
      fromUser: user.id,
      fromNickname: user.nickname,
      toUser: user.id,
      toNickname: user.nickname,
      city: user.city,
      timestamp: now,
    });
    storage.updateBook(book.id, { currentHolderId: user.id });
    showToast('已确认收到！', 'success');
  };

  const handleArchive = () => {
    const now = Date.now();
    storage.addRecord({
      id: id(),
      bookId: book.id,
      action: '完成',
      fromUser: user.id,
      fromNickname: user.nickname,
      toUser: user.id,
      toNickname: user.nickname,
      city: user.city,
      timestamp: now,
    });
    storage.updateBook(book.id, { status: '已归档' });
    showToast('漂流已完成，书籍已归档', 'success');
  };

  return (
    <div>
      <div className="back-link" onClick={() => navigate('/')}>← 返回首页</div>

      <div className="detail-header">
        <div className="detail-cover">
          {book.cover ? (
            <img src={book.cover} alt={book.title} />
          ) : (
            <div className="book-cover-placeholder" style={{ height: 267, fontSize: 64 }}>
              {coverEmojis[book.category] || '📚'}
            </div>
          )}
        </div>
        <div className="detail-meta">
          <div className="detail-title">{book.title}</div>
          <div className="detail-author">{book.author}</div>
          <div className="detail-summary">{book.summary}</div>
          <div className="detail-info-row">
            <span className="tag tag-category">{book.category}</span>
            <span className={`tag ${book.type === '漂流' ? 'tag-drift' : 'tag-swap'}`}>{book.type}</span>
            <span className={`tag ${statusClass[book.status]}`}>{book.status}</span>
            <span className="badge badge-primary">漂流码: {book.driftCode}</span>
          </div>
          {book.status !== '已归档' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {isHolder && (
                <button className="btn btn-primary" onClick={() => setShowSendModal(true)}>
                  {book.type === '换书' ? '发起换书' : '寄出漂流'}
                </button>
              )}
              {!isHolder && book.status === '漂流中' && (
                <button className="btn btn-success" onClick={handleReceive}>确认收到</button>
              )}
              {isHolder && book.status === '漂流中' && (
                <button className="btn btn-secondary" onClick={handleArchive}>归档（结束漂流）</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drift Code */}
      <div className="drift-code-box">
        <div className="drift-code-label">专属漂流码</div>
        <div className="drift-code-value">{book.driftCode}</div>
        <div className="drift-code-hint">分享此码，让其他人查看这本书的漂流轨迹</div>
      </div>

      {/* Cities */}
      {cities.length > 1 && (
        <div className="cities-bar">
          <div className="cities-bar-title">📍 足迹地图</div>
          <div className="cities-list">
            {cities.map((city, i) => (
              <React.Fragment key={city}>
                <span className="city-tag">{city}</span>
                {i < cities.length - 1 && <span className="city-arrow">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <DriftTimeline records={records} />

      {/* Rating & Reviews */}
      <div className="rating-section">
        <div className="rating-header">
          <div className="rating-score">{averageRating > 0 ? averageRating.toFixed(1) : '暂无'}</div>
          <div>
            {renderStars(Math.round(averageRating))}
            <div className="rating-count">{reviews.length} 条评价</div>
          </div>
        </div>

        <div className="review-form">
          <div className="form-label" style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>
            {myExistingReview ? '更新我的评价' : '写下你的评价'}
          </div>
          {myExistingReview && (
            <div className="my-review-card">
              <div className="my-review-label">你已评价过这本书，可以修改或删除</div>
            </div>
          )}
          <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>点击星星评分</div>
          {renderStars(myRating, true, 'large')}
          <textarea
            className="form-textarea"
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            placeholder="分享你对这本书的看法..."
            rows={4}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={handleSubmitReview}>
              {myExistingReview ? '更新评价' : '提交评价'}
            </button>
            {myExistingReview && (
              <button className="btn btn-secondary" onClick={() => handleDeleteReview(myExistingReview.id)}>
                删除评价
              </button>
            )}
          </div>
        </div>

        <div className="review-list">
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>
              暂无评价，来做第一个评价的人吧
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="review-user">
                    <div className="review-avatar">{review.nickname.charAt(0)}</div>
                    <div>
                      <div className="review-nickname">{review.nickname}</div>
                      <div className="review-time">{formatDate(review.timestamp)}</div>
                    </div>
                  </div>
                  <div className="review-rating">{renderStars(review.rating, false, 'small')}</div>
                </div>
                <div className="review-comment">{review.comment}</div>
                {review.userId === user.id && (
                  <div className="review-actions">
                    <button className="review-delete-btn" onClick={() => handleDeleteReview(review.id)}>
                      删除
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{book.type === '换书' ? '发起换书' : '寄出漂流'}</div>
            <div className="form-group">
              <label className="form-label">对方昵称</label>
              <input className="form-input" value={targetNickname} onChange={(e) => setTargetNickname(e.target.value)} placeholder="输入对方昵称" />
            </div>
            <div className="form-group">
              <label className="form-label">对方城市</label>
              <input className="form-input" value={targetCity} onChange={(e) => setTargetCity(e.target.value)} placeholder="输入对方所在城市" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSendModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleSend}>确认寄出</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
