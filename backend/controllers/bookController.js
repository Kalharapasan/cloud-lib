// ============================================================
// Cloud Lib — Book Controller (CRUD + Search/Filter)
// ============================================================
const pool = require('../config/db');
const { uploadBookCover } = require('../services/s3Service');

/**
 * GET /api/books
 * List all books with optional search filtering
 * Query params: ?search=term (searches title, author, ISBN, category, publisher)
 */
const getAllBooks = async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM Books';
    let params = [];

    if (search) {
      query += ' WHERE Title LIKE ? OR Author LIKE ? OR ISBN LIKE ? OR Category LIKE ? OR Publisher LIKE ?';
      const term = `%${search}%`;
      params = [term, term, term, term, term];
    }

    query += ' ORDER BY Title ASC';

    const [books] = await pool.query(query, params);
    res.json({ books, total: books.length });
  } catch (err) {
    console.error('GetAllBooks error:', err.message);
    res.status(500).json({ error: 'Failed to fetch books.' });
  }
};

/**
 * GET /api/books/:id
 * Get single book by ID
 */
const getBookById = async (req, res) => {
  try {
    const [books] = await pool.query('SELECT * FROM Books WHERE BookID = ?', [req.params.id]);
    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }
    res.json({ book: books[0] });
  } catch (err) {
    console.error('GetBookById error:', err.message);
    res.status(500).json({ error: 'Failed to fetch book.' });
  }
};

/**
 * POST /api/books
 * Add a new book (Admin only)
 */
const createBook = async (req, res) => {
  try {
    const { title, author, isbn, quantity, description, category, publisher, publishYear, coverImage } = req.body;

    if (!title || !author || !isbn) {
      return res.status(400).json({ error: 'Title, author, and ISBN are required.' });
    }

    const qty = parseInt(quantity) || 0;
    const status = qty > 0 ? 'Available' : 'Out of Stock';

    // Check ISBN uniqueness
    const [existing] = await pool.query('SELECT BookID FROM Books WHERE ISBN = ?', [isbn]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A book with this ISBN already exists.' });
    }

    const [result] = await pool.query(
      'INSERT INTO Books (Title, Author, ISBN, Quantity, Status, Description, Category, Publisher, PublishYear, CoverImage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        title, 
        author, 
        isbn, 
        qty, 
        status, 
        description || null, 
        category || null, 
        publisher || null, 
        publishYear ? parseInt(publishYear) : null, 
        coverImage || null
      ]
    );

    res.status(201).json({
      message: 'Book added successfully',
      book: { 
        BookID: result.insertId, 
        Title: title, 
        Author: author, 
        ISBN: isbn, 
        Quantity: qty, 
        Status: status,
        Description: description || null,
        Category: category || null,
        Publisher: publisher || null,
        PublishYear: publishYear ? parseInt(publishYear) : null,
        CoverImage: coverImage || null
      }
    });
  } catch (err) {
    console.error('CreateBook error:', err.message);
    res.status(500).json({ error: 'Failed to add book.' });
  }
};

/**
 * PUT /api/books/:id
 * Update book details (Admin only)
 */
const updateBook = async (req, res) => {
  try {
    const { title, author, isbn, quantity, description, category, publisher, publishYear, coverImage } = req.body;
    const bookId = req.params.id;

    // Check book exists
    const [existing] = await pool.query('SELECT * FROM Books WHERE BookID = ?', [bookId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    const book = existing[0];
    const qty = quantity !== undefined ? parseInt(quantity) : book.Quantity;
    const status = qty > 0 ? 'Available' : 'Out of Stock';

    // Check ISBN uniqueness (exclude current book)
    if (isbn && isbn !== book.ISBN) {
      const [isbnCheck] = await pool.query(
        'SELECT BookID FROM Books WHERE ISBN = ? AND BookID != ?',
        [isbn, bookId]
      );
      if (isbnCheck.length > 0) {
        return res.status(409).json({ error: 'Another book with this ISBN already exists.' });
      }
    }

    await pool.query(
      `UPDATE Books 
       SET Title = ?, Author = ?, ISBN = ?, Quantity = ?, Status = ?, 
           Description = ?, Category = ?, Publisher = ?, PublishYear = ?, CoverImage = ? 
       WHERE BookID = ?`,
      [
        title || book.Title,
        author || book.Author,
        isbn || book.ISBN,
        qty,
        status,
        description !== undefined ? description : book.Description,
        category !== undefined ? category : book.Category,
        publisher !== undefined ? publisher : book.Publisher,
        publishYear !== undefined ? (publishYear ? parseInt(publishYear) : null) : book.PublishYear,
        coverImage !== undefined ? coverImage : book.CoverImage,
        bookId
      ]
    );

    res.json({ message: 'Book updated successfully' });
  } catch (err) {
    console.error('UpdateBook error:', err.message);
    res.status(500).json({ error: 'Failed to update book.' });
  }
};

/**
 * DELETE /api/books/:id
 * Remove a book (Admin only)
 */
const deleteBook = async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT BookID FROM Books WHERE BookID = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    await pool.query('DELETE FROM Books WHERE BookID = ?', [req.params.id]);
    res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('DeleteBook error:', err.message);
    res.status(500).json({ error: 'Failed to delete book.' });
  }
};

/**
 * POST /api/books/upload
 * Upload a book cover image (Admin only)
 */
const uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }
    const imageUrl = await uploadBookCover(req.file, req);
    res.json({ imageUrl });
  } catch (err) {
    console.error('UploadCoverImage error:', err.message);
    res.status(500).json({ error: 'Failed to upload cover image.' });
  }
};

module.exports = { getAllBooks, getBookById, createBook, updateBook, deleteBook, uploadCoverImage };
