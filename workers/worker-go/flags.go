package main

import (
	"fmt"
	"strings"
)

var goRegexFlagOrder = []string{"i", "m", "s", "U"}

var goRegexSupportedFlags = map[string]struct{}{
	"i": {},
	"m": {},
	"s": {},
	"U": {},
}

func supportedGoRegexFlags() []string {
	flags := make([]string, len(goRegexFlagOrder))
	copy(flags, goRegexFlagOrder)
	return flags
}

func buildGoRegexInlineFlagPrefix(flags []string) (string, error) {
	if len(flags) == 0 {
		return "", nil
	}

	requested := make(map[string]struct{}, len(flags))
	for _, flag := range flags {
		if _, ok := goRegexSupportedFlags[flag]; !ok {
			return "", fmt.Errorf("unsupported regex flag for Go regexp: %q", flag)
		}
		requested[flag] = struct{}{}
	}

	var b strings.Builder
	for _, flag := range goRegexFlagOrder {
		if _, ok := requested[flag]; ok {
			b.WriteString(flag)
		}
	}

	if b.Len() == 0 {
		return "", nil
	}

	return "(?" + b.String() + ")", nil
}