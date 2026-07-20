"""Skip the Docling provider tests when the optional `docling` dep is absent.

The Docling adapter modules (``app.models.docling.*``) import ``docling`` at
module load time, so these tests can only be collected in an environment with
the Docling extras installed (``pip install -r requirements-docling.txt``).

CI and lightweight dev setups install only the base + dev dependencies, so the
whole directory is ignored there instead of failing collection. Install the
Docling extras locally to run them.
"""

import importlib.util

if importlib.util.find_spec("docling") is None:
    collect_ignore_glob = ["*"]
