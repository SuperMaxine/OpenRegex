<?php

require __DIR__ . '/../vendor/autoload.php';

use OpenRegex\Worker\Registry;
use OpenRegex\Worker\Processor;

$redisUrl = getenv('REDIS_URL') ?: 'redis://redis:6379';
$client = new Predis\Client($redisUrl);

try {
    Registry::registerEngines($client);
    Processor::listenAndProcess($client);
} catch (\Exception $e) {
    echo "Fatal error during startup: " . $e->getMessage() . "\n";
    exit(1);
}