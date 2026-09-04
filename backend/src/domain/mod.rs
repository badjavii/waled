//! Domain layer.
//!
//! Contains pure business types, domain errors, and the ports (traits)
//! that outer layers must implement. This layer has no dependencies on
//! Tauri, SQLite, HTTP clients, or any I/O concern.

pub mod errors;
pub mod models;
pub mod ports;
