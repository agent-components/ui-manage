import { trpc } from "./trpc";

export type Design = {
  id: string;
  name: string;
  ownerAccount: string;
  objectKey: string;
  byteSize: number | null;
  createdAt: string;
  updatedAt: string;
};

type ShareState = {
  enabled: boolean;
  shareToken: string | null;
  url: string | null;
};

export function useUiManageDesigns() {
  function list() {
    return trpc.designs.list.query();
  }

  function create(name: string) {
    return trpc.designs.create.mutate({ name });
  }

  function get(id: string) {
    return trpc.designs.get.query({ id });
  }

  function rename(id: string, name: string) {
    return trpc.designs.rename.mutate({ id, name });
  }

  function remove(id: string) {
    return trpc.designs.delete.mutate({ id });
  }

  function getShare(id: string): Promise<ShareState> {
    return trpc.designs.share.get.query({ id });
  }

  function enableShare(id: string): Promise<ShareState> {
    return trpc.designs.share.enable.mutate({ id });
  }

  function disableShare(id: string): Promise<ShareState> {
    return trpc.designs.share.disable.mutate({ id });
  }

  return {
    list,
    create,
    get,
    rename,
    remove,
    getShare,
    enableShare,
    disableShare,
  };
}
