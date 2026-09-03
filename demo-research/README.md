# Deterministic demo research project

These small checked-in artifacts back the judge demo. They represent two controlled research versions; the editor starts with selected v1 manuscript values while the provenance graph points to the locked v2 artifacts.

- `results/stress-eval-v1.json` supports the superseded 18.2% claim.
- `results/stress-eval-v2.json` is the current 16.8% locked result.
- `configs/train-v1.yaml` and `configs/train-v2.yaml` change the learning rate from `3e-4` to `2e-4`.
- `tables/evaluation-v1.csv` and `tables/evaluation-v2.csv` show the stale stress row.
- `data/dataset-manifest.json` supports the correct 481,000-observation claim.
- `figures/figure-manifest.json` connects the stale and current rendered figures to their source result versions.

No external API, model output, or experiment execution is required. The artifacts exist to make Research X-Ray, Verify This, and Research Diff reproducible during judging.
