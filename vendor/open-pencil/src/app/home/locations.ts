import { computed } from "vue";

import {
  homeLocation,
  homeLocationChosen,
  type HomeLocation,
} from "./location";

/** A Home location as the sidebar and the phone menu name it. */
export type HomeLocationView =
  | { kind: "recent"; id: "recent" }
  | { kind: "shared"; id: "shared" }
  | { kind: "storage"; id: "storage" };

const VIEWS = {
  recent: { kind: "recent", id: "recent" },
  shared: { kind: "shared", id: "shared" },
  storage: { kind: "storage", id: "storage" },
} as const satisfies Record<HomeLocation["kind"], HomeLocationView>;

/** Flat design-file places only — no Cloud workspace「空间」. */
export function useHomeLocations() {
  const location = computed({
    get: () => VIEWS[homeLocation.value.kind],
    set(next: HomeLocationView) {
      homeLocation.value = { kind: next.kind };
    },
  });

  const locations = computed<HomeLocationView[]>(() => [
    VIEWS.storage,
    VIEWS.shared,
  ]);

  return {
    location,
    locations,
    chosen: homeLocationChosen,
  };
}
