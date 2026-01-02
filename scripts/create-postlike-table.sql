-- PostLike 테이블 생성 SQL
-- MySQL에서 실행하세요: mysql -u root -p yogizogi < create-postlike-table.sql

USE yogizogi;

CREATE TABLE IF NOT EXISTS PostLike (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '좋아요 누른 사용자 ID',
  post_id BIGINT NOT NULL COMMENT '좋아요 대상 게시글 ID',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '좋아요 생성 시간',
  PRIMARY KEY (id),
  INDEX idx_postlike_post_id (post_id),
  INDEX idx_postlike_user_id (user_id),
  UNIQUE KEY uk_user_post_like (user_id, post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

