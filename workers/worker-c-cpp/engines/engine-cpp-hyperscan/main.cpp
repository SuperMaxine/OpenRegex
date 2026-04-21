#include <iostream>
#include <string>
#include <vector>
#include <hs/hs.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

struct ScanContext {
    json matches;
    std::string text;
    int match_id;
};

static int match_handler(unsigned int id, unsigned long long from, unsigned long long to, unsigned int flags, void *ctx) {
    ScanContext* context = static_cast<ScanContext*>(ctx);
    json match_item;
    match_item["match_id"] = context->match_id++;
    match_item["start"] = from;
    match_item["end"] = to;
    match_item["full_match"] = context->text.substr(from, to - from);
    match_item["groups"] = json::array(); // Hyperscan does not support sub-capturing groups

    context->matches.push_back(match_item);
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

        unsigned int hs_flags = HS_FLAG_SOM_LEFTMOST;
        for (const auto& f : flags_array) {
            if (f.is_string()) {
                std::string val = f.get<std::string>();
                if (val == "i") hs_flags |= HS_FLAG_CASELESS;
                if (val == "m") hs_flags |= HS_FLAG_MULTILINE;
                if (val == "s") hs_flags |= HS_FLAG_DOTALL;
                if (val == "u") hs_flags |= HS_FLAG_UTF8 | HS_FLAG_UCP;
            }
        }

        hs_database_t *database = nullptr;
        hs_compile_error_t *compile_err = nullptr;

        if (hs_compile(pattern_str.c_str(), hs_flags, HS_MODE_BLOCK, nullptr, &database, &compile_err) != HS_SUCCESS) {
            json err;
            err["success"] = false;
            err["error"] = std::string("Compilation failed: ") + (compile_err ? compile_err->message : "Unknown error");
            std::cout << err.dump() << std::endl;
            hs_free_compile_error(compile_err);
            continue;
        }

        hs_scratch_t *scratch = nullptr;
        if (hs_alloc_scratch(database, &scratch) != HS_SUCCESS) {
            json err;
            err["success"] = false;
            err["error"] = "Failed to allocate scratch space";
            std::cout << err.dump() << std::endl;
            hs_free_database(database);
            continue;
        }

        ScanContext ctx;
        ctx.matches = json::array();
        ctx.text = text;
        ctx.match_id = 0;

        if (hs_scan(database, text.c_str(), text.length(), 0, scratch, match_handler, &ctx) != HS_SUCCESS) {
            json err;
            err["success"] = false;
            err["error"] = "Scanning failed";
            std::cout << err.dump() << std::endl;
        } else {
            json response;
            response["success"] = true;
            response["matches"] = ctx.matches;
            std::cout << response.dump() << std::endl;
        }

        hs_free_scratch(scratch);
        hs_free_database(database);
    }
    return 0;
}