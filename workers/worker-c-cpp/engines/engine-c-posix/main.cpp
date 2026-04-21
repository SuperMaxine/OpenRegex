#include <iostream>
#include <string>
#include <vector>
#include <regex.h>
#include <nlohmann/json.hpp>

/*
 * OpenRegex Nebula: C (POSIX regex.h) Standalone Subprocess Engine
 * Wraps the native C libc regex functions.
 * Compiles using REG_EXTENDED.
 */

using json = nlohmann::json;

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;
        json req;
        try {
            req = json::parse(line);
        } catch (...) {
            std::cout << "{\"success\": false, \"error\": \"Invalid JSON input\"}\n";
            continue;
        }

        std::string pattern_str = req["regex"];
        std::string text = req["text"];
        json flags_array = req["flags"];

        int cflags = REG_EXTENDED;
        for (const auto& f : flags_array) {
            if (f.is_string()) {
                std::string val = f.get<std::string>();
                if (val == "i") cflags |= REG_ICASE;
                if (val == "m") cflags |= REG_NEWLINE;
            }
        }

        regex_t regex;
        int ret = regcomp(&regex, pattern_str.c_str(), cflags);
        if (ret != 0) {
            char errbuf[256];
            regerror(ret, &regex, errbuf, sizeof(errbuf));
            json err;
            err["success"] = false;
            err["error"] = std::string("Compilation failed: ") + errbuf;
            std::cout << err.dump() << std::endl;
            continue;
        }

        json response;
        response["success"] = true;
        response["matches"] = json::array();

        size_t max_groups = regex.re_nsub + 1;
        std::vector<regmatch_t> pmatch(max_groups);

        int match_id = 0;
        const char* cursor = text.c_str();
        size_t offset = 0;
        int eflags = 0;

        while (regexec(&regex, cursor, max_groups, pmatch.data(), eflags) == 0) {
            json match_item;
            match_item["match_id"] = match_id++;

            size_t start = offset + pmatch[0].rm_so;
            size_t end = offset + pmatch[0].rm_eo;
            match_item["start"] = start;
            match_item["end"] = end;
            match_item["full_match"] = text.substr(start, end - start);

            json groups_array = json::array();
            for (size_t i = 1; i < max_groups; i++) {
                if (pmatch[i].rm_so != -1) {
                    json g;
                    g["group_id"] = i;
                    g["name"] = nullptr;
                    size_t g_start = offset + pmatch[i].rm_so;
                    size_t g_end = offset + pmatch[i].rm_eo;
                    g["start"] = g_start;
                    g["end"] = g_end;
                    g["content"] = text.substr(g_start, g_end - g_start);
                    groups_array.push_back(g);
                }
            }

            match_item["groups"] = groups_array;
            response["matches"].push_back(match_item);

            offset += pmatch[0].rm_eo;
            cursor += pmatch[0].rm_eo;

            if (pmatch[0].rm_eo == 0) {
                offset++;
                cursor++;
            }
            if (offset > text.length()) break;

            // Prevent ^ from matching mid-string after we've advanced the cursor (unless REG_NEWLINE handles it)
            eflags = REG_NOTBOL;
        }

        regfree(&regex);
        std::cout << response.dump() << std::endl;
    }
    return 0;
}