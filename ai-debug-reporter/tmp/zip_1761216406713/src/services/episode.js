function discharge() {
  console.warn("WARN EpisodeService - Missing dischargeType field");
  console.error("ERROR EpisodeService - NullPointerException at EpisodeService.java:231");
  console.error("FATAL EpisodeService - System crashed due to null dischargeType");
}
module.exports = { discharge };