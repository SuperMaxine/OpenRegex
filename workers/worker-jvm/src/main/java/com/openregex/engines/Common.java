package com.openregex.engines;

public class Common {
    public static final String WORKER_VERSION = System.getenv("WORKER_VERSION") != null ? System.getenv("WORKER_VERSION") : "Unknown";
    public static final String WORKER_RELEASE_DATE = System.getenv("WORKER_RELEASE_DATE") != null ? System.getenv("WORKER_RELEASE_DATE") : "Unreleased";
    public static final String JAVA_VERSION = System.getProperty("java.version");

    public static final String CAT_CLASSES = "Character Classes & Escapes";
    public static final String CAT_ANCHORS = "Anchors & Boundaries";
    public static final String CAT_QUANTIFIERS = "Quantifiers";
    public static final String CAT_GROUPS = "Grouping & Backreferences";
    public static final String CAT_ADVANCED = "Lookarounds & Advanced";
}