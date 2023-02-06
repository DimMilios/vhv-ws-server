CREATE TABLE actions (
    id BIGINT AUTO_INCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `type` varchar(50),
    content JSON,
    username VARCHAR(100),
    filename VARCHAR(100),
    course VARCHAR(100),
    PRIMARY KEY (id)
);