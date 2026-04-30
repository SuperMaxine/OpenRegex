#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <cctype>
#include <re2/re2.h>
#include <nlohmann/json.hpp>

/*
 * OpenRegex Nebula: RE2 Standalone Subprocess Engine
 * Designed to be invoked by the cpp-worker node via stdin/stdout.
 * Compiles strictly in $O(n)$ time complexity to prevent ReDoS.
 */

using json = nlohmann::json;

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        json req;
        try {
            req = json::parse(line);
        } catch (const json::parse_error& e) {
            std::cout << "{\"success\": false, \"error\": \"Invalid JSON input\"}\n";
            continue;
        }

        std::string pattern_str = req["regex"];
        std::string text = req["text"];
        json flags_array = req["flags"];

        RE2::Options options;
        options.set_log_errors(false);
        options.set_max_mem(8 << 20);

        std::string inline_flags = "";
        for (const auto& f : flags_array) {
            if (f.is_string()) {
                std::string val = f.get<std::string>();
                if (val == "i" || val == "m" || val == "s") {
                    inline_flags += val;
                } else if (!val.empty() && std::isdigit(val[0])) {
                    options.set_max_mem(std::stoi(val));
                }
            } else if (f.is_number()) {
                options.set_max_mem(f.get<int>());
            }
        }

        if (!inline_flags.empty()) {
            pattern_str = "(?" + inline_flags + ")" + pattern_str;
        }

        RE2 pattern(pattern_str, options);
        if (!pattern.ok()) {
            json err;
            err["success"] = false;
            err["error"] = "Compilation failed: " + pattern.error();
            std::cout << err.dump() << std::endl;
            continue;
        }

        int nmatch = pattern.NumberOfCapturingGroups() + 1;
        std::vector<re2::StringPiece> groups(nmatch);

        std::map<int, std::string> group_names;
        for (const auto& kv : pattern.NamedCapturingGroups()) {
            group_names[kv.second] = kv.first;
        }

        json response;
        response["success"] = true;
        response["matches"] = json::array();

        size_t pos = 0;
        int match_id = 0;
        // Manual offset tracking to isolate exact byte positions
        while (pos <= text.size() && pattern.Match(text, pos, text.size(), RE2::UNANCHORED, groups.data(), nmatch)) {
            json match_item;
            match_item["match_id"] = match_id++;
            match_item["full_match"] = std::string(groups[0].data(), groups[0].size());

            size_t start_offset = groups[0].data() - text.data();
            match_item["start"] = start_offset;
            match_item["end"] = start_offset + groups[0].size();

            json groups_array = json::array();
            for (int i = 1; i < nmatch; ++i) {
                if (groups[i].data() != nullptr) {
                    json g;
                    g["group_id"] = i;
                    if (group_names.count(i)) {
                        g["name"] = group_names[i];
                    } else {
                        g["name"] = nullptr;
                    }
                    g["content"] = std::string(groups[i].data(), groups[i].size());
                    size_t g_start = groups[i].data() - text.data();
                    g["start"] = g_start;
                    g["end"] = g_start + groups[i].size();
                    groups_array.push_back(g);
                }
            }

            match_item["groups"] = groups_array;
            response["matches"].push_back(match_item);
            pos = start_offset + groups[0].size();
            if (groups[0].empty()) {
                pos++; // Prevent infinite loop on empty matches
            }
        }

        std::cout << response.dump() << std::endl;
    }
    return 0;
}