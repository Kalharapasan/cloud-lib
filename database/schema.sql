-- ============================================================
-- Cloud Lib — Library Management System
-- Database Schema for Amazon RDS MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS cloud_lib;
USE cloud_lib;

-- ── MIGRATION QUERY SCRIPTS (Run these if database already exists) ──
-- ALTER TABLE Users ADD COLUMN StudentID VARCHAR(50) UNIQUE DEFAULT NULL;
-- ALTER TABLE Users ADD COLUMN Phone VARCHAR(20) DEFAULT NULL;
-- ALTER TABLE Users ADD COLUMN Department VARCHAR(100) DEFAULT NULL;
-- ALTER TABLE Books ADD COLUMN Description TEXT DEFAULT NULL;
-- ALTER TABLE Books ADD COLUMN Category VARCHAR(100) DEFAULT NULL;
-- ALTER TABLE Books ADD COLUMN Publisher VARCHAR(150) DEFAULT NULL;
-- ALTER TABLE Books ADD COLUMN PublishYear INT DEFAULT NULL;
-- ALTER TABLE Books ADD COLUMN CoverImage VARCHAR(255) DEFAULT NULL;

-- ============================================================
-- 1. Users Table
-- ============================================================
CREATE TABLE IF NOT EXISTS Users (
    UserID       INT             AUTO_INCREMENT PRIMARY KEY,
    Name         VARCHAR(100)    NOT NULL,
    Email        VARCHAR(150)    NOT NULL UNIQUE,
    Role         ENUM('Student', 'Admin') NOT NULL DEFAULT 'Student',
    PasswordHash VARCHAR(255)    NOT NULL,
    StudentID    VARCHAR(50)     UNIQUE DEFAULT NULL,
    Phone        VARCHAR(20)     DEFAULT NULL,
    Department   VARCHAR(100)    DEFAULT NULL,
    CreatedAt    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_users_email (Email),
    INDEX idx_users_role  (Role),
    INDEX idx_users_student_id (StudentID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Books Table
-- ============================================================
CREATE TABLE IF NOT EXISTS Books (
    BookID       INT             AUTO_INCREMENT PRIMARY KEY,
    Title        VARCHAR(255)    NOT NULL,
    Author       VARCHAR(200)    NOT NULL,
    ISBN         VARCHAR(20)     NOT NULL UNIQUE,
    Quantity     INT             NOT NULL DEFAULT 0 CHECK (Quantity >= 0),
    Status       ENUM('Available', 'Out of Stock') NOT NULL DEFAULT 'Available',
    Description  TEXT            DEFAULT NULL,
    Category     VARCHAR(100)    DEFAULT NULL,
    Publisher    VARCHAR(150)    DEFAULT NULL,
    PublishYear  INT             DEFAULT NULL,
    CoverImage   VARCHAR(255)    DEFAULT NULL,
    CreatedAt    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_books_isbn   (ISBN),
    INDEX idx_books_title  (Title),
    INDEX idx_books_author (Author)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Borrow Records Table
-- ============================================================
CREATE TABLE IF NOT EXISTS Borrow_Records (
    RecordID      INT           AUTO_INCREMENT PRIMARY KEY,
    UserID        INT           NOT NULL,
    BookID        INT           NOT NULL,
    IssueDate     DATE          NOT NULL DEFAULT (CURRENT_DATE),
    DueDate       DATE          NOT NULL,
    ReturnDate    DATE          NULL,
    ReturnStatus  ENUM('Pending', 'Returned') NOT NULL DEFAULT 'Pending',

    CONSTRAINT fk_borrow_user FOREIGN KEY (UserID)
        REFERENCES Users(UserID) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_borrow_book FOREIGN KEY (BookID)
        REFERENCES Books(BookID) ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_borrow_user_status (UserID, ReturnStatus),
    INDEX idx_borrow_due         (DueDate),
    INDEX idx_borrow_status      (ReturnStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Seed Data
-- ============================================================

-- Library Admin (password: admin123)
-- Hash generated with bcrypt, 10 rounds
INSERT INTO Users (Name, Email, Role, PasswordHash) VALUES
('Library Admin', 'admin@cloudlib.com', 'Admin', '$2a$10$mwrWHNB3THFHo5ZQv/iMduTsN4dqTYzPLvcwYuCCvXNFrPBCTp9F6')
ON DUPLICATE KEY UPDATE Name=Name;

-- Seed Student (password: student123)
-- Hash: $2a$10$vK6hTebfC6/XqUsk2t/6P.lWskqJdE1y8sQG6dE0x7wO0a6e0y1a
INSERT INTO Users (Name, Email, Role, PasswordHash, StudentID, Phone, Department) VALUES
('Library Student', 'student@cloudlib.com', 'Student', '$2a$10$vK6hTebfC6/XqUsk2t/6P.lWskqJdE1y8sQG6dE0x7wO0a6e0y1a', 'STU-2026-001', '+1-555-0199', 'Computer Science')
ON DUPLICATE KEY UPDATE Name=Name;

-- Sample books with descriptions, category, publisher, publish year
INSERT INTO Books (Title, Author, ISBN, Quantity, Status, Description, Category, Publisher, PublishYear) VALUES
('Clean Code', 'Robert C. Martin', '978-0132350884', 5, 'Available', 'A handbook of agile software craftsmanship that helps developers write clean, maintainable, and elegant code.', 'Programming', 'Prentice Hall', 2008),
('The Pragmatic Programmer', 'David Thomas', '978-0135957059', 3, 'Available', 'One of the most significant books on software development, covering coding standards, tool use, and career development.', 'Software Engineering', 'Addison-Wesley', 1999),
('Design Patterns', 'Erich Gamma', '978-0201633610', 2, 'Available', 'The classic guide to object-oriented programming design patterns, illustrating concepts with simple design options.', 'Design Patterns', 'Addison-Wesley', 1994),
('Introduction to Algorithms', 'Thomas H. Cormen', '978-0262033848', 4, 'Available', 'A comprehensive textbook covering the analysis and design of algorithms, standard in computer science education.', 'Algorithms', 'MIT Press', 2009),
('Database System Concepts', 'Abraham Silberschatz', '978-0078022159', 3, 'Available', 'A fundamental book on database management systems, covering relational databases, query languages, and database design.', 'Databases', 'McGraw-Hill', 2010),
('Computer Networking', 'James Kurose', '978-0133594140', 6, 'Available', 'A top-down approach to computer networking, explaining protocols and architecture from the application layer down.', 'Networking', 'Pearson', 2012),
('Artificial Intelligence', 'Stuart Russell', '978-0136042594', 2, 'Available', 'The standard textbook on artificial intelligence, describing search, logic, machine learning, and neural networks.', 'Artificial Intelligence', 'Pearson', 2009),
('Operating System Concepts', 'Abraham Silberschatz', '978-1118063330', 4, 'Available', 'A core textbook on operating system design, covering processes, memory management, file systems, and security.', 'Operating Systems', 'Wiley', 2012)
ON DUPLICATE KEY UPDATE Title=Title;
