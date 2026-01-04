-- TravelPost 테이블에 is_advertisement 컬럼 추가
-- 광고성 게시글 여부를 저장하는 필드

ALTER TABLE TravelPost 
ADD COLUMN is_advertisement BOOLEAN NOT NULL DEFAULT FALSE 
COMMENT '광고성 게시글 여부' 
AFTER is_deleted;

-- 인덱스 추가 (광고성 게시글 필터링 성능 향상)
CREATE INDEX idx_post_advertisement ON TravelPost(is_advertisement, is_deleted, created_at);

