#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <oniguruma.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

static int name_callback(const UChar* name, const UChar* name_end,
                         int ngroup_num, int* group_nums,
                         regex_t* reg, void* arg) {
    auto* name_map = static_cast<std::map<int, std::string>*>(arg);
    std::string gname(reinterpret_cast<const char*>(name), name_end - name);
    for (int i = 0; i < ngroup_num; i++) {
        (*name_map)[group_nums[i]] = gname;
    }
    return 0;
}

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

        OnigOptionType options = ONIG_OPTION_NONE;
        for (const auto& f : flags_array) {
            if (f.is_string()) {
                std::string val = f.get<std::string>();
                if (val == "i") options |= ONIG_OPTION_IGNORECASE;
                if (val == "m") options |= ONIG_OPTION_MULTILINE;
                if (val == "s") options |= ONIG_OPTION_SINGLELINE;
                if (val == "x") options |= ONIG_OPTION_EXTEND;
            }
        }

        OnigErrorInfo einfo;
        regex_t* reg;
        int r = onig_new(&reg,
                         reinterpret_cast<const UChar*>(pattern_str.c_str()),
                         reinterpret_cast<const UChar*>(pattern_str.c_str() + pattern_str.length()),
                         options, ONIG_ENCODING_UTF8, ONIG_SYNTAX_DEFAULT, &einfo);

        if (r != ONIG_NORMAL) {
            UChar s[ONIG_MAX_ERROR_MESSAGE_LEN];
            onig_error_code_to_str(s, r, &einfo);
            json err;
            err["success"] = false;
            err["error"] = std::string("Compilation failed: ") + reinterpret_cast<char*>(s);
            std::cout << err.dump() << std::endl;
            continue;
        }

        std::map<int, std::string> group_names;
        onig_foreach_name(reg, name_callback, &group_names);

        OnigRegion* region = onig_region_new();
        json response;
        response["success"] = true;
        response["matches"] = json::array();

        const UChar* str = reinterpret_cast<const UChar*>(text.c_str());
        const UChar* end = str + text.length();
        const UChar* start = str;
        const UChar* range = end;
        int match_id = 0;

        while (start <= end) {
            r = onig_search(reg, str, end, start, range, region, ONIG_OPTION_NONE);
            if (r >= 0) {
                json match_item;
                match_item["match_id"] = match_id++;
                match_item["start"] = region->beg[0];
                match_item["end"] = region->end[0];
                match_item["full_match"] = text.substr(region->beg[0], region->end[0] - region->beg[0]);

                json groups_array = json::array();
                for (int i = 1; i < region->num_regs; i++) {
                    if (region->beg[i] != -1) {
                        json g;
                        g["group_id"] = i;
                        if (group_names.count(i)) {
                            g["name"] = group_names[i];
                        } else {
                            g["name"] = nullptr;
                        }
                        g["start"] = region->beg[i];
                        g["end"] = region->end[i];
                        g["content"] = text.substr(region->beg[i], region->end[i] - region->beg[i]);
                        groups_array.push_back(g);
                    }
                }
                match_item["groups"] = groups_array;
                response["matches"].push_back(match_item);

                if (region->beg[0] == region->end[0]) {
                    start = str + region->end[0] + 1;
                } else {
                    start = str + region->end[0];
                }
            } else {
                break;
            }
        }

        onig_region_free(region, 1);
        onig_free(reg);

        std::cout << response.dump() << std::endl;
    }
    return 0;
}