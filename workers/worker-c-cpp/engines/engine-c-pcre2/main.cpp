#define PCRE2_CODE_UNIT_WIDTH 8
#include <iostream>
#include <string>
#include <vector>
#include <pcre2.h>
#include <nlohmann/json.hpp>

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

        uint32_t options = 0;
        for (const auto& f : flags_array) {
            if (f.is_string()) {
                std::string val = f.get<std::string>();
                if (val == "i") options |= PCRE2_CASELESS;
                if (val == "m") options |= PCRE2_MULTILINE;
                if (val == "s") options |= PCRE2_DOTALL;
                if (val == "x") options |= PCRE2_EXTENDED;
            }
        }

        int errornumber;
        PCRE2_SIZE erroroffset;
        pcre2_code *re = pcre2_compile(
            reinterpret_cast<PCRE2_SPTR>(pattern_str.c_str()),
            PCRE2_ZERO_TERMINATED,
            options,
            &errornumber,
            &erroroffset,
            NULL
        );

        if (re == NULL) {
            PCRE2_UCHAR buffer[256];
            pcre2_get_error_message(errornumber, buffer, sizeof(buffer));
            json err;
            err["success"] = false;
            err["error"] = std::string("Compilation failed: ") + reinterpret_cast<char*>(buffer);
            std::cout << err.dump() << std::endl;
            continue;
        }

        pcre2_match_data *match_data = pcre2_match_data_create_from_pattern(re, NULL);
        json response;
        response["success"] = true;
        response["matches"] = json::array();

        PCRE2_SIZE subject_length = text.length();
        PCRE2_SPTR subject = reinterpret_cast<PCRE2_SPTR>(text.c_str());
        PCRE2_SIZE start_offset = 0;
        int match_id = 0;

        uint32_t namecount;
        uint32_t nameentrysize;
        PCRE2_SPTR nametable;
        pcre2_pattern_info(re, PCRE2_INFO_NAMECOUNT, &namecount);
        pcre2_pattern_info(re, PCRE2_INFO_NAMEENTRYSIZE, &nameentrysize);
        pcre2_pattern_info(re, PCRE2_INFO_NAMETABLE, &nametable);

        while (start_offset <= subject_length) {
            uint32_t match_options = 0;
            int rc = pcre2_match(re, subject, subject_length, start_offset, match_options, match_data, NULL);

            if (rc < 0) {
                break;
            }

            PCRE2_SIZE *ovector = pcre2_get_ovector_pointer(match_data);
            if (ovector[0] > ovector[1]) break;

            json match_item;
            match_item["match_id"] = match_id++;
            match_item["start"] = ovector[0];
            match_item["end"] = ovector[1];
            match_item["full_match"] = text.substr(ovector[0], ovector[1] - ovector[0]);

            json groups_array = json::array();
            for (int i = 1; i < rc; i++) {
                json g;
                g["group_id"] = i;
                g["name"] = nullptr;

                for (uint32_t n = 0; n < namecount; n++) {
                    int n_idx = (nametable[n * nameentrysize] << 8) | nametable[n * nameentrysize + 1];
                    if (n_idx == i) {
                        g["name"] = reinterpret_cast<const char*>(nametable + n * nameentrysize + 2);
                        break;
                    }
                }

                if (ovector[2*i] != PCRE2_UNSET) {
                    g["start"] = ovector[2*i];
                    g["end"] = ovector[2*i+1];
                    g["content"] = text.substr(ovector[2*i], ovector[2*i+1] - ovector[2*i]);
                    groups_array.push_back(g);
                }
            }
            match_item["groups"] = groups_array;
            response["matches"].push_back(match_item);

            start_offset = ovector[1];
            if (ovector[0] == ovector[1]) {
                if (start_offset == subject_length) break;
                start_offset += 1;
            }
        }

        pcre2_match_data_free(match_data);
        pcre2_code_free(re);

        std::cout << response.dump() << std::endl;
    }
    return 0;
}