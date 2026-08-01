/**
 * Extract the 60-bit timestamp (100-ns intervals since the UUID epoch) from a
 * v1 time-based UUID as a single Number, so two such ids compare chronologically.
 *
 * Server message ids are Cassandra v1 timeuuids. We need true time order here
 * because read receipts carry a message id (the read watermark) and we must
 * decide which of the loaded messages are "at or before" that watermark —
 * comparing the canonical uuid strings would order by time_low first (the LEAST
 * significant bits), which is not chronological and would mark the wrong
 * messages as read for anything more than ~7 min apart.
 */
export function uuidV1Timestamp(uuid: string): number {
  // Canonical layout: time_low(8)-time_mid(4)-ver+time_hi(4)-clock(4)-node(12)
  const timeLow = parseInt(uuid.slice(0, 8), 16);
  const timeMid = parseInt(uuid.slice(9, 13), 16);
  // char 14 is the version nibble; time_hi is the remaining 3 nibbles (12 bits)
  const timeHi = parseInt(uuid.slice(15, 18), 16);
  // Assemble the 60-bit value. The high terms exceed 2^32, so multiply rather
  // than use bitwise OR (which truncates to 32 bits). The result stays well
  // below 2^53, so it is represented exactly as a JS Number. A non-v1/non-uuid
  // string yields NaN; comparisons with NaN are false, which safely excludes
  // local optimistic ids (e.g. "temp-...") from read-marking.
  return timeHi * 2 ** 48 + timeMid * 2 ** 32 + timeLow;
}