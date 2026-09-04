//! Domain-level error taxonomy.
//!
//! Infrastructure errors (SQL, HTTP, I/O) are converted into these variants
//! at the adapter boundary so the application layer never leaks technical
//! details to callers.

use thiserror::Error;

/// Errors that any Waled use case may produce.
#[derive(Debug, Error)]
pub enum DomainError {
    #[error("entity not found: {0}")]
    NotFound(String),

    #[error("validation failed: {0}")]
    Validation(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("persistence error: {0}")]
    Persistence(String),

    #[error("notification error: {0}")]
    Notification(String),

    #[error("unexpected error: {0}")]
    Unexpected(String),
}

/// Convenience alias used throughout services and repositories.
pub type DomainResult<T> = Result<T, DomainError>;
