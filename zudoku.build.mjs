// Keep fence metadata through rehype-raw, which drops node.data.
function preserveFenceMetadata() {
  return function visit(node) {
    if (node.tagName === "code" && node.data?.meta) {
      node.properties.metastring = node.data.meta;
    }
    node.children?.forEach(visit);
  };
}

export default {
  rehypePlugins(plugins) {
    return [preserveFenceMetadata, ...plugins.map((entry) => {
      if (!Array.isArray(entry) || !entry[1]?.codeToHast) return entry;
      const [plugin, highlighter, options] = entry;
      return [plugin, highlighter, {
        ...options,
        transformers: [...options.transformers, {
          name: "preserve-code-title",
          code(node) {
            // Shiki replaces the code node, discarding its existing title attribute.
            const title = this.options.meta?.title
              ?? (this.options.lang === "bash" ? "Terminal" : undefined);
            if (typeof title === "string") node.properties.title = title;
          },
        }],
      }];
    })];
  },
};
