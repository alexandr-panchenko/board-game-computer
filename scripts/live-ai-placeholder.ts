if (process.env.LIVE_AI_TEST !== "true") {
  console.error(
    "Live AI tests are opt-in. Set LIVE_AI_TEST=true after M5 is implemented.",
  );
  process.exit(1);
}

console.error("Live AI integration is not implemented before M5.");
process.exit(1);
