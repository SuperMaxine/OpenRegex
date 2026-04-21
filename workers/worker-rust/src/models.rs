use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct MatchRequest {
    pub task_id: String,
    pub engine_id: String,
    pub regex: String,
    pub text: String,
    pub flags: Vec<String>,
    pub text_payload_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MatchGroup {
    pub group_id: usize,
    pub name: Option<String>,
    pub content: String,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MatchItem {
    pub match_id: usize,
    pub full_match: String,
    pub start: usize,
    pub end: usize,
    pub groups: Vec<MatchGroup>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MatchResult {
    pub task_id: String,
    pub engine_id: String,
    pub success: bool,
    pub matches: Vec<MatchItem>,
    pub execution_time_ms: f64,
    pub error: Option<String>,
}