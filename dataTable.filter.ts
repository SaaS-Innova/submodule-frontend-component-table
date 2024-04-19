import Fuse from 'fuse.js';

export const fuseFilterForGlobalFilter = (data: [], query: string, columns: string[]) => {
    const fuseOptionsForGlobalFilter = {
        keys: columns,
        includeScore: true,
        threshold: 0.1,
    };
    const fuse = new Fuse(data, fuseOptionsForGlobalFilter);

    return fuse.search(query).map((data) => data.item);
};
