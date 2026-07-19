from types import SimpleNamespace

from app.models.surya._mappers import table_result_to_structure


def test_table_result_to_structure_maps_cells():
    cell = SimpleNamespace(
        row_id=0,
        col_id=0,
        bbox=[10, 10, 40, 40],
        polygon=[[10, 10], [40, 10], [40, 40], [10, 40]],
        is_header=True,
        rowspan=1,
        colspan=1,
    )
    row = SimpleNamespace(
        row_id=0,
        bbox=[0, 0, 100, 20],
        polygon=[[0, 0], [100, 0], [100, 20], [0, 20]],
        is_header=True,
    )
    col = SimpleNamespace(
        col_id=0,
        bbox=[0, 0, 50, 100],
        polygon=[[0, 0], [50, 0], [50, 100], [0, 100]],
        is_header=True,
    )
    result = SimpleNamespace(
        cells=[cell],
        rows=[row],
        cols=[col],
        image_bbox=[0, 0, 100, 100],
    )
    table = table_result_to_structure(result, "t1", 100, 100)
    assert table.id == "t1"
    assert table.rows == 1
    assert table.cols == 1
    assert table.cells[0].is_header is True
