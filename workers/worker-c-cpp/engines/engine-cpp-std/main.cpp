#include <iostream>
#include <string>
#include <vector>
#include <regex>
#include <nlohmann/json.hpp>

/*
 * OpenRegex Nebula: STD::REGEX Standalone Subprocess Engine
 * Provides standard C++11 regex capabilities (ECMAScript dialect).
 * Susceptible to ReDoS as it uses an NFA backtracking engine.
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

        auto regex_flags = std::regex_constants::ECMAScript;
        for (const auto& f : flags_array) {
            if (f.is_string()) {
                std::string val = f.get<std::string>();
                if (val == "i") {
                    regex_flags |= std::regex_constants::icase;
                }
            }
        }

        std::regex pattern;
        try {
            pattern.assign(pattern_str, regex_flags);
        } catch (const std::regex_error& e) {
            json err;
            err["success"] = false;
            err["error"] = std::string("Compilation failed: ") + e.what();
            std::cout << err.dump() << std::endl;
            continue;
        }

        json response;
        response["success"] = true;
        response["matches"] = json::array();

        auto words_begin = std::sregex_iterator(text.begin(), text.end(), pattern);
        auto words_end = std::sregex_iterator();

        int match_id = 0;
        for (std::sregex_iterator i = words_begin; i != words_end; ++i) {
            std::smatch match = *i;
            json match_item;
            match_item["match_id"] = match_id++;
            match_item["full_match"] = match.str(0);
            match_item["start"] = match.position(0);
            match_item["end"] = match.position(0) + match.length(0);

            json groups_array = json::array();
            for (size_t j = 1; j < match.size(); ++j) {
                if (match[j].matched) {
                    json g;
                    g["group_id"] = j;
                    g["name"] = nullptr; // std::regex does not support dynamic named group lookups cleanly
                    g["content"] = match.str(j);
                    g["start"] = match.position(j);
                    g["end"] = match.position(j) + match.length(j);
                    groups_array.push_back(g);
                }
            }

            match_item["groups"] = groups_array;
            response["matches"].push_back(match_item);
        }

        std::cout << response.dump() << std::endl;
    }
    return 0;
}