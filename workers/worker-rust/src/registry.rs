use redis::AsyncCommands;
use serde_json::json;
use std::env;

pub async fn register_engines(con: &mut redis::aio::MultiplexedConnection) -> redis::RedisResult<()> {
    let worker_version = env::var("WORKER_VERSION").unwrap_or_else(|_| "1.0.0".to_string());
    let release_date = env::var("WORKER_RELEASE_DATE").unwrap_or_else(|_| "Unreleased".to_string());
    let library_version = "1.12";

    let worker_info = json!({
        "worker_name": "worker-rust",
        "worker_version": worker_version,
        "worker_release_date": release_date,
        "engines": [
            {
                "engine_id": "rust_standard",
                "engine_language_type": "Rust",
                "engine_language_version": "1.75+",
                "engine_regex_lib": "regex",
                "engine_regex_lib_version": library_version,
                "engine_label": "Rust (regex crate)",
                "engine_capabilities": {
                    "flags": ["i", "m", "s", "R", "U", "u", "x"],
                    "supports_lookaround": false,
                    "supports_backrefs": false
                },
                "engine_docs": {
                    "trivia": [
                        "Guarantees worst-case O(m * n) search time, where m is proportional to the regex size and n is proportional to the haystack size.",
                        "Avoids features such as lookaround and backreferences to maintain predictable performance.",
                        "Unicode mode is enabled by default for &str regexes and can be disabled with the 'u' flag only where valid.",
                        "Supports lazy quantifiers, named capture groups, Unicode properties, and character-class set operations."
                    ],
                    "cheat_sheet_url": "https://docs.rs/regex/latest/regex/"
                },
                "engine_cheat_sheet": [
                    {
                        "category": "Character Classes & Escapes",
                        "items": [
                            { "character": ".", "description": "Any character except newline unless 's' flag is set" },
                            { "character": "\\w", "description": "Unicode word character by default; ASCII-only when Unicode mode is disabled" },
                            { "character": "\\W", "description": "Non-word character" },
                            { "character": "\\d", "description": "Unicode decimal digit by default; ASCII-only when Unicode mode is disabled" },
                            { "character": "\\D", "description": "Non-digit" },
                            { "character": "\\s", "description": "Unicode whitespace character by default; ASCII-only when Unicode mode is disabled" },
                            { "character": "\\S", "description": "Non-whitespace character" },
                            { "character": "\\p{Greek}", "description": "Unicode character property" },
                            { "character": "\\P{Greek}", "description": "Negated Unicode character property" },
                            { "character": "[a-z]", "description": "Character class" },
                            { "character": "[^a-z]", "description": "Negated character class" },
                            { "character": "[a-z&&[^aeiou]]", "description": "Character-class intersection" },
                            { "character": "[a-z--[aeiou]]", "description": "Character-class difference" }
                        ]
                    },
                    {
                        "category": "Anchors & Boundaries",
                        "items": [
                            { "character": "^", "description": "Start of haystack, or start of line if 'm' flag is set" },
                            { "character": "$", "description": "End of haystack, or end of line if 'm' flag is set" },
                            { "character": "\\A", "description": "Absolute start of haystack" },
                            { "character": "\\z", "description": "Absolute end of haystack" },
                            { "character": "\\b", "description": "Unicode word boundary by default" },
                            { "character": "\\B", "description": "Not a Unicode word boundary by default" },
                            { "character": "\\b{start}", "description": "Start-of-word boundary" },
                            { "character": "\\b{end}", "description": "End-of-word boundary" }
                        ]
                    },
                    {
                        "category": "Quantifiers",
                        "items": [
                            { "character": "*", "description": "0 or more times, greedy" },
                            { "character": "+", "description": "1 or more times, greedy" },
                            { "character": "?", "description": "0 or 1 time, greedy" },
                            { "character": "{m,n}", "description": "Between m and n times, greedy" },
                            { "character": "*?", "description": "0 or more times, lazy" },
                            { "character": "+?", "description": "1 or more times, lazy" },
                            { "character": "??", "description": "0 or 1 time, lazy" },
                            { "character": "{m,n}?", "description": "Between m and n times, lazy" }
                        ]
                    },
                    {
                        "category": "Grouping & Captures",
                        "items": [
                            { "character": "(...)", "description": "Capturing group" },
                            { "character": "(?:...)", "description": "Non-capturing group" },
                            { "character": "(?P<name>...)", "description": "Named capturing group" },
                            { "character": "(?<name>...)", "description": "Named capturing group" }
                        ]
                    },
                    {
                        "category": "Inline Flags & Advanced",
                        "items": [
                            { "character": "(?i)", "description": "Inline flag: Case-insensitive" },
                            { "character": "(?m)", "description": "Inline flag: Multiline mode for ^ and $" },
                            { "character": "(?s)", "description": "Inline flag: Dot matches newline" },
                            { "character": "(?R)", "description": "Inline flag: CRLF-aware mode" },
                            { "character": "(?U)", "description": "Inline flag: Swap greedy and lazy quantifier behavior" },
                            { "character": "(?u)", "description": "Inline flag: Unicode mode" },
                            { "character": "(?-u)", "description": "Inline flag: Disable Unicode mode where valid" },
                            { "character": "(?x)", "description": "Inline flag: Ignore insignificant whitespace and allow comments" },
                            { "character": "(?i:...)", "description": "Scoped inline flag" },
                            { "character": "(?-i:...)", "description": "Scoped inline flag disable" }
                        ]
                    }
                ],
                "engine_examples": [
                    {
                        "regex": "(?P<IP>(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d))(/(\\d{1,2}))?(?:-(?P<IP2>(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)))?(?::(?P<port>\\d{1,5}))?",
                        "text": "This is an example to get IP:\n\n192.168.1.100\n192.168.1.100:8080\n127.0.0.1\n192.168.1.0/24\n192.168.1.1-192.168.1.255\n192.168.1.1-192.168.1.255:80\n192.168.1.0/24:80"
                    }
                ]
            }
        ]
    });

    let json_str = serde_json::to_string(&worker_info).unwrap();
    let _: () = con.hset("openregex:workers", "worker-rust", json_str).await?;
    println!("[Worker] Registered 'worker-rust' with 1 engine.");

    Ok(())
}