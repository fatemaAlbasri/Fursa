
jest.mock('../config/db', () => ({
  query: jest.fn(),
  connect: jest.fn()
}))

jest.mock('../services/cvAi', () => ({
  aiEnabled: jest.fn()
}))

jest.mock('../services/cvOptimizer', () => ({
  reviewCv: jest.fn(),
  applySuggestions: jest.fn(),
  missingContent: jest.fn(),
  cleanCvText: jest.fn((text) => text),
  COMPARISON_LABELS: {
    short_summary: 'Short summary',
    projects_with_tools: 'Projects with tools',
    full_skill_names: 'Full skill names',
    relevant_courses: 'Relevant courses'
  }
}))

jest.mock('../services/cvPdf', () => ({
  renderCv: jest.fn(),
  renderReport: jest.fn()
}))

const db = require('../config/db')
const { aiEnabled } = require('../services/cvAi')
const {
  reviewCv,
  missingContent
} = require('../services/cvOptimizer')

const controller = require('./CvOptimizerController')

// ==========================================
// GET REVIEW
// ==========================================

describe('CvOptimizerController - getReview', () => {
  let req
  let res
  let next

  beforeEach(() => {
    jest.clearAllMocks()

    req = {
      user: { id: 1 }
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    next = jest.fn()
  })

  test('returns 404 when the user has no current CV', async () => {
    db.query.mockResolvedValue({ rows: [] })

    await controller.getReview(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Please upload your CV first'
    })

    expect(next).not.toHaveBeenCalled()
  })

  test('returns canReview false when CV has no parsed text', async () => {
    db.query.mockResolvedValue({
      rows: [{
        id: 10,
        file_name: 'cv.pdf',
        parsed_text: null,
        uploaded_at: new Date(),
        major: 'Computer Science'
      }]
    })

    await controller.getReview(req, res, next)

    expect(res.json).toHaveBeenCalledWith({
      review: null,
      canReview: false
    })

    expect(next).not.toHaveBeenCalled()
  })

  test('returns the review when CV has readable text', async () => {
    const resume = {
      id: 10,
      file_name: 'cv.pdf',
      parsed_text: 'Ahmed Ali\nSummary\nDeveloper',
      uploaded_at: new Date(),
      major: 'Computer Science'
    }

    const review = {
      id: 20,
      strength_score: 70,
      is_advanced: false,
      created_at: new Date()
    }

    db.query
      .mockResolvedValueOnce({ rows: [resume] })
      .mockResolvedValueOnce({ rows: [review] })
      .mockResolvedValueOnce({ rows: [] })

    missingContent.mockResolvedValue([])

    await controller.getReview(req, res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        canReview: true,
        review: expect.objectContaining({
          id: 20,
          strengthScore: 70,
          isAdvanced: false,
          suggestions: []
        })
      })
    )

    expect(next).not.toHaveBeenCalled()
  })

  test('passes database errors to next', async () => {
    const error = new Error('Database error')

    db.query.mockRejectedValue(error)

    await controller.getReview(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})

// ==========================================
// CREATE REVIEW - BASIC CASES
// ==========================================

describe('CvOptimizerController - createReview', () => {
  let req
  let res
  let next

  beforeEach(() => {
    jest.clearAllMocks()

    req = {
      user: { id: 1 }
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    next = jest.fn()
  })

  test('returns 404 when the user has no current CV', async () => {
    db.query.mockResolvedValue({ rows: [] })

    await controller.createReview(req, res, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Please upload your CV first'
    })
  })

  test('returns 422 when CV has no parsed text', async () => {
    db.query.mockResolvedValue({
      rows: [{
        id: 10,
        file_name: 'cv.pdf',
        parsed_text: null,
        uploaded_at: new Date(),
        major: 'Computer Science'
      }]
    })

    await controller.createReview(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith({
      error: "We couldn't read this CV. Please upload a PDF or Word file that isn't a scanned image."
    })
  })

  test('returns 503 when AI is unavailable', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 10,
          file_name: 'cv.pdf',
          parsed_text: 'Ahmed Ali\nSummary\nDeveloper',
          uploaded_at: new Date(),
          major: 'Computer Science'
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 0 })

    aiEnabled.mockReturnValue(false)

    await controller.createReview(req, res, next)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({
      error: 'The AI CV Optimizer is not available right now'
    })

    expect(reviewCv).not.toHaveBeenCalled()
  })

  test('returns 502 when AI review fails', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 10,
          file_name: 'cv.pdf',
          parsed_text: 'Ahmed Ali\nSummary\nDeveloper',
          uploaded_at: new Date(),
          major: 'Computer Science'
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 0 })

    aiEnabled.mockReturnValue(true)
    reviewCv.mockRejectedValue(new Error('AI service failed'))

    await controller.createReview(req, res, next)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({
      error: "We couldn't review your CV right now. Please try again."
    })

    expect(next).not.toHaveBeenCalled()
  })
})

// ==========================================
// CREATE REVIEW - DATABASE TRANSACTION
// ==========================================

describe('createReview - database transaction', () => {
  let req
  let res
  let next
  let client

  const resume = {
    id: 10,
    file_name: 'cv.pdf',
    parsed_text: 'Ahmed Ali\nSummary\nDeveloper',
    uploaded_at: new Date(),
    major: 'Computer Science'
  }

  const result = {
    strength: 65,
    potential: 85,
    comparison: {
      short_summary: true
    },
    suggestions: [
      {
        section: 'summary',
        before: 'Developer',
        after: 'Software Developer',
        reason: 'More specific',
        points: 5
      },
      {
        section: 'projects',
        before: 'Built an app',
        after: 'Built an app using React',
        reason: 'Adds tools',
        points: 10
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset mock implementations to prevent test interference
    db.query.mockReset()
    db.connect.mockReset()
    reviewCv.mockReset()
    missingContent.mockReset()
    aiEnabled.mockReset()

    req = {
      user: { id: 1 }
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    }

    next = jest.fn()

    client = {
      query: jest.fn(),
      release: jest.fn()
    }

    db.connect.mockResolvedValue(client)
    aiEnabled.mockReturnValue(true)
    reviewCv.mockResolvedValue(result)
    missingContent.mockResolvedValue([])
  })

  test('creates review and suggestions successfully', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [resume] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // Lock resume
      .mockResolvedValueOnce({ rows: [] }) // Check existing review
      .mockResolvedValueOnce({ rows: [{ id: 20 }] }) // Insert review
      .mockResolvedValueOnce({}) // First suggestion
      .mockResolvedValueOnce({}) // Second suggestion
      .mockResolvedValueOnce({}) // COMMIT

    await controller.createReview(req, res, next)

    expect(reviewCv).toHaveBeenCalled()
    expect(client.query).toHaveBeenCalledWith('BEGIN')
    expect(client.query).toHaveBeenCalledWith('COMMIT')

    const suggestionCalls = client.query.mock.calls.filter(
      ([query]) => query.includes('INSERT INTO cv_suggestions')
    )

    expect(suggestionCalls).toHaveLength(2)

    // First suggestion is free preview
    expect(suggestionCalls[0][1][6]).toBe(true)

    // Second suggestion is locked
    expect(suggestionCalls[1][1][6]).toBe(false)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(client.release).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  test('rolls back transaction when database insertion fails', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [resume] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 0 })

    const error = new Error('Database insertion failed')

    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // Lock resume
      .mockResolvedValueOnce({ rows: [] }) // Check existing review
      .mockRejectedValueOnce(error) // Insert review
      .mockResolvedValueOnce({}) // ROLLBACK

    await controller.createReview(req, res, next)

    expect(reviewCv).toHaveBeenCalled()
    expect(client.query).toHaveBeenCalledWith('BEGIN')
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(error)
  })
})
