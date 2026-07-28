import tempfile
import unittest
from pathlib import Path

from scripts.deploy_docs_to_oss import (
    cache_control_for,
    collect_files,
    collect_uploads,
    content_type_for,
    normalize_prefix,
    object_names_for,
    parse_bucket,
)


class DeployDocsToOssTests(unittest.TestCase):
    def test_parse_bucket(self) -> None:
        self.assertEqual(parse_bucket("oss://docs-bucket/"), "docs-bucket")
        self.assertEqual(parse_bucket("oss://docs-bucket"), "docs-bucket")

    def test_parse_bucket_rejects_object_prefix(self) -> None:
        with self.assertRaises(ValueError):
            parse_bucket("oss://docs-bucket/site/")

    def test_cache_control(self) -> None:
        self.assertEqual(
            cache_control_for("assets/index-123.js"),
            "public, max-age=31536000, immutable",
        )
        self.assertEqual(
            cache_control_for("index.html"),
            "no-cache",
        )

    def test_normalize_prefix(self) -> None:
        self.assertEqual(
            normalize_prefix("/calle-docs-site/test/"),
            "calle-docs-site/test/",
        )

    def test_normalize_prefix_rejects_unsafe_segments(self) -> None:
        with self.assertRaises(ValueError):
            normalize_prefix("")
        with self.assertRaises(ValueError):
            normalize_prefix("../docs")

    def test_content_type_for_openapi(self) -> None:
        self.assertEqual(
            content_type_for(Path("calle.openapi.yaml")),
            "application/yaml; charset=utf-8",
        )

    def test_content_types_for_agent_and_html_files(self) -> None:
        self.assertEqual(
            content_type_for(Path("quickstart.html")),
            "text/html; charset=utf-8",
        )
        self.assertEqual(
            content_type_for(Path("quickstart.md")),
            "text/markdown; charset=utf-8",
        )
        self.assertEqual(
            content_type_for(Path("llms.txt")),
            "text/plain; charset=utf-8",
        )

    def test_collect_files_uploads_assets_before_html_and_index_last(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            assets = dist / "assets"
            assets.mkdir()
            (dist / "index.html").write_text("<html></html>")
            (dist / "quickstart.html").write_text("<html>Quickstart</html>")
            (assets / "index.js").write_text("console.log('ready')")

            files = collect_files(dist)

        self.assertEqual(files[0].name, "index.js")
        self.assertEqual(files[-2].name, "quickstart.html")
        self.assertEqual(files[-1].name, "index.html")

    def test_html_routes_have_extensionless_oss_aliases(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            route = dist / "api-reference" / "calls.html"
            route.parent.mkdir()
            route.write_text("<html>Calls</html>")

            names = object_names_for(route, dist)

        self.assertEqual(
            names,
            ("api-reference/calls.html", "api-reference/calls"),
        )

    def test_status_and_index_pages_do_not_have_aliases(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            index = dist / "index.html"
            not_found = dist / "404.html"
            index.write_text("<html>Index</html>")
            not_found.write_text("<html>Not found</html>")

            self.assertEqual(object_names_for(index, dist), ("index.html",))
            self.assertEqual(object_names_for(not_found, dist), ("404.html",))

    def test_collect_uploads_includes_clean_route_object(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            dist = Path(directory)
            (dist / "index.html").write_text("<html>Index</html>")
            (dist / "quickstart.html").write_text("<html>Quickstart</html>")

            object_names = [
                object_name
                for _, object_name in collect_uploads(dist)
            ]

        self.assertIn("quickstart.html", object_names)
        self.assertIn("quickstart", object_names)


if __name__ == "__main__":
    unittest.main()
