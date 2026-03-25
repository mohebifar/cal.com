import { sleep } from "k6";
import { THRESHOLDS } from "../utils/config";
import { viewBookingPage } from "../utils/helpers";

export const options = {
  vus: 10,
  duration: "2m",
  thresholds: {
    http_req_failed: THRESHOLDS.HTTP_ERRORS,
    http_req_duration: THRESHOLDS.RESPONSE_TIME.SMOKE.p95,
  },
};

export default function () {
  viewBookingPage("pro", "30min");

  sleep(0.5);
}
