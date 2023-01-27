CREATE TABLE actions (
    id BIGINT AUTO_INCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `type` ENUM('notes', 'score', 'chords', 'comments'),
    content JSON,
    user_id BIGINT,
    course_id BIGINT,
    PRIMARY KEY (id)
);