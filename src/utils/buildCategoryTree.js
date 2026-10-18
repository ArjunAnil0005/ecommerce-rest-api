function buildCategoryTree(categories) {
  const nodesById = new Map(
    categories.map((category) => [
      String(category._id),
      { ...category, children: [] },
    ]),
  );
  const roots = [];

  for (const node of nodesById.values()) {
    if (node.parent === null) {
      roots.push(node);
      continue;
    }

    const parent = nodesById.get(String(node.parent));
    if (parent) parent.children.push(node);
  }

  return roots;
}

module.exports = buildCategoryTree;
