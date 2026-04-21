#include <iostream>
#include <string>
#include <vector>
#include <boost/regex.hpp>
#include <nlohmann/json.hpp>

/*
 * OpenRegex Nebula: BOOST::REGEX Standalone Subprocess Engine
 * Provides Boost regular expression matching.
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

        // Use boost::regex::flag_type to resolve explicit type casting errors
        boost::regex::flag_type regex_flags = boost::regex::perl;
        for (const auto& f : flags_array) {
            if (f.is_string()) {
                std::string val = f.get<std::string>();
                if (val == "i") regex_flags |= boost::regex::icase;
                if (val == "s") regex_flags |= boost::regex::mod_s;
                if (val == "x") regex_flags |= boost::regex::mod_x;
            }
        }

        boost::regex pattern;
        try {
            pattern.assign(pattern_str, regex_flags);
        } catch (const boost::regex_error& e) {
            json err;
            err["success"] = false;
            err["error"] = std::string("Compilation failed: ") + e.what();
            std::cout << err.dump() << std::endl;
            continue;
        }

        json response;
        response["success"] = true;
        response["matches"] = json::array();

        auto words_begin = boost::sregex_iterator(text.begin(), text.end(), pattern);
        auto words_end = boost::sregex_iterator();

        int match_id = 0;
        for (boost::sregex_iterator i = words_begin; i != words_end; ++i) {
            boost::smatch match = *i;
            json match_item;
            match_item["match_id"] = match_id++;
            match_item["full_match"] = match.str(0);

            // Explicitly cast to size_t to avoid ambiguity between position(size_type) and position(const char_type*)
            match_item["start"] = match.position(static_cast<size_t>(0));
            match_item["end"] = match.position(static_cast<size_t>(0)) + match.length(0);

            json groups_array = json::array();
            for (size_t j = 1; j < match.size(); ++j) {
                if (match[j].matched) {
                    json g;
                    g["group_id"] = j;
                    g["name"] = nullptr;
                    g["content"] = match.str(j);
                    g["start"] = match.position(static_cast<size_t>(j));
                    g["end"] = match.position(static_cast<size_t>(j)) + match.length(j);
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