CREATE TABLE documents (
  id bigint NOT NULL AUTO_INCREMENT,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NULL DEFAULT NULL,
  title varchar(255) DEFAULT NULL,
  y_doc_state longtext,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE documents_users (
  document_id bigint NOT NULL,
  user_id bigint NOT NULL,
  PRIMARY KEY (document_id, user_id)
) ENGINE=InnoDB;
