import { computed } from "vue";

import { useHomeCloud } from "@/app/cloud/integration";

import {
  homeLocation,
  homeLocationChosen,
  type HomeLocation,
} from "./location";

/** A Home location as the sidebar and the phone menu name it. */
export type HomeLocationView =
  | { kind: "recent"; id: "recent" }
  | { kind: "workspace"; id: string }
  | { kind: "shared"; id: "shared" }
  | { kind: "storage"; id: "storage" };

const VIEWS = {
  recent: { kind: "recent", id: "recent" },
  shared: { kind: "shared", id: "shared" },
  storage: { kind: "storage", id: "storage" },
} as const satisfies Record<
  Exclude<HomeLocation["kind"], "workspace">,
  HomeLocationView
>;

function toView(location: HomeLocation): HomeLocationView {
  return location.kind === "workspace" ? location : VIEWS[location.kind];
}

function fromView(location: HomeLocationView): HomeLocation {
  return location.kind === "workspace" ? location : { kind: location.kind };
}

/** ui-manage: recent-files removed — Home locations still resolve Cloud/storage for leftover UI. */
export function useHomeLocations() {
  const cloud = useHomeCloud();

  const location = computed({
    get: () => toView(homeLocation.value),
    set(next: HomeLocationView) {
      homeLocation.value = fromView(next);
    },
  });

  const locations = computed<HomeLocationView[]>(() => {
    const workspaces = cloud.workspaces.value.map((workspace) => ({
      kind: "workspace" as const,
      id: workspace.id,
    }));
    return [VIEWS.storage, VIEWS.shared, ...workspaces];
  });

  return {
    location,
    locations,
    chosen: homeLocationChosen,
    cloud,
  };
}
