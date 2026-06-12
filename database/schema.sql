-- ============================================================
-- Cloud Lib — Library Management System
-- Database Schema for Amazon RDS MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS cloud_lib;
USE cloud_lib;

-- ============================================================
-- 1. Users Table
-- ============================================================
CREATE TABLE IF NOT EXISTS Users (
    UserID      INT             AUTO_INCREMENT PRIMARY KEY,
    Name        VARCHAR(100)    NOT NULL,
    Email       VARCHAR(150)    NOT NULL UNIQUE,
    Role        ENUM('Student', 'Admin') NOT NULL DEFAULT 'Student',
    PasswordHash VARCHAR(255)   NOT NULL,
    CreatedAt   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_users_email (Email),
    INDEX idx_users_role  (Role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Books Table
-- ============================================================
CREATE TABLE IF NOT EXISTS Books (
    BookID      INT             AUTO_INCREMENT PRIMARY KEY,
    Title       VARCHAR(255)    NOT NULL,
    Author      VARCHAR(200)    NOT NULL,
    ISBN        VARCHAR(20)     NOT NULL UNIQUE,
    Quantity    INT             NOT NULL DEFAULT 0 CHECK (Quantity >= 0),
    Status      ENUM('Available', 'Out of Stock') NOT NULL DEFAULT 'Available',
    CreatedAt   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

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

-- Admin user (password: admin123)
-- Hash generated with bcrypt, 10 rounds
INSERT INTO Users (Name, Email, Role, PasswordHash) VALUES
('Library Admin', 'admin@cloudlib.com', 'Admin', '$2a$10$mwrWHNB3THFHo5ZQv/iMduTsN4dqTYzPLvcwYuCCvXNFrPBCTp9F6');


-- Sample books
INSERT INTO Books (Title, Author, ISBN, Quantity, Status) VALUES
('Clean Code',                        'Robert C. Martin',      '978-0132350884', 5,  'Available'),
('The Pragmatic Programmer',          'David Thomas',          '978-0135957059', 3,  'Available'),
('Design Patterns',                   'Erich Gamma',           '978-0201633610', 2,  'Available'),
('Introduction to Algorithms',        'Thomas H. Cormen',      '978-0262033848', 4,  'Available'),
('Database System Concepts',          'Abraham Silberschatz',  '978-0078022159', 3,  'Available'),
('Computer Networking',               'James Kurose',          '978-0133594140', 6,  'Available'),
('Artificial Intelligence',           'Stuart Russell',        '978-0136042594', 2,  'Available'),
('Operating System Concepts',         'Abraham Silberschatz',  '978-1118063330', 4,  'Available');
