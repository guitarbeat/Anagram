/**
 * treemap.ts
 * Squarified Treemap layout algorithm (Bruls, Huizing, van Wijk)
 * Computes optimal aspect-ratio rectangular partition of 2D space proportional to values.
 */

export interface TreemapItem {
  length: number;
  count: number;
}

export interface TreemapTile {
  length: number;
  count: number;
  percentage: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GenericTreemapItem<T = unknown> {
  id: string;
  count: number;
  data?: T;
}

export interface GenericTreemapTile<T = unknown> {
  id: string;
  count: number;
  percentage: number;
  x: number;
  y: number;
  w: number;
  h: number;
  data?: T;
}

/**
 * Computes a squarified treemap partition for arbitrary items with an id and count.
 */
export function computeSquarifiedTreemapGeneric<T = unknown>(
  items: GenericTreemapItem<T>[],
  width: number,
  height: number
): GenericTreemapTile<T>[] {
  const validItems = items.filter((i) => i.count > 0);
  if (validItems.length === 0 || width <= 0 || height <= 0) return [];

  const totalCount = validItems.reduce((acc, curr) => acc + curr.count, 0);
  if (totalCount === 0) return [];

  // Sort descending by count
  const sorted = [...validItems].sort((a, b) => b.count - a.count);
  const totalArea = width * height;

  const tiles: GenericTreemapTile<T>[] = [];

  function getWorstAspectRatio(rowAreas: number[], rowAreaSum: number, sideLength: number): number {
    if (sideLength <= 0 || rowAreaSum <= 0) return Infinity;
    const rowThickness = rowAreaSum / sideLength;
    let worst = 0;
    for (const area of rowAreas) {
      const itemLen = area / rowThickness;
      const ratio = Math.max(itemLen / rowThickness, rowThickness / itemLen);
      if (ratio > worst) worst = ratio;
    }
    return worst;
  }

  let curX = 0;
  let curY = 0;
  let curW = width;
  let curH = height;

  let row: GenericTreemapItem<T>[] = [];
  let rowAreaSum = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const itemArea = (item.count / totalCount) * totalArea;
    const side = Math.min(curW, curH);

    const testAreas = [...row.map((r) => (r.count / totalCount) * totalArea), itemArea];
    const testAreaSum = rowAreaSum + itemArea;

    if (row.length === 0) {
      row.push(item);
      rowAreaSum += itemArea;
    } else {
      const currentWorst = getWorstAspectRatio(
        row.map((r) => (r.count / totalCount) * totalArea),
        rowAreaSum,
        side
      );
      const newWorst = getWorstAspectRatio(testAreas, testAreaSum, side);

      if (newWorst <= currentWorst) {
        row.push(item);
        rowAreaSum += itemArea;
      } else {
        // Lay out current row
        const alongWidth = curW <= curH;
        if (alongWidth) {
          const rowHeight = rowAreaSum / curW;
          let rX = curX;
          for (const rItem of row) {
            const a = (rItem.count / totalCount) * totalArea;
            const itemW = a / rowHeight;
            tiles.push({
              id: rItem.id,
              count: rItem.count,
              percentage: (rItem.count / totalCount) * 100,
              x: rX,
              y: curY,
              w: itemW,
              h: rowHeight,
              data: rItem.data,
            });
            rX += itemW;
          }
          curY += rowHeight;
          curH = Math.max(0, curH - rowHeight);
        } else {
          const rowWidth = rowAreaSum / curH;
          let rY = curY;
          for (const rItem of row) {
            const a = (rItem.count / totalCount) * totalArea;
            const itemH = a / rowWidth;
            tiles.push({
              id: rItem.id,
              count: rItem.count,
              percentage: (rItem.count / totalCount) * 100,
              x: curX,
              y: rY,
              w: rowWidth,
              h: itemH,
              data: rItem.data,
            });
            rY += itemH;
          }
          curX += rowWidth;
          curW = Math.max(0, curW - rowWidth);
        }

        row = [item];
        rowAreaSum = itemArea;
      }
    }
  }

  // Lay out final row
  if (row.length > 0) {
    const alongWidth = curW <= curH;
    if (alongWidth) {
      const rowHeight = curH;
      let rX = curX;
      for (const rItem of row) {
        const a = (rItem.count / totalCount) * totalArea;
        const itemW = rowAreaSum > 0 ? (a / rowAreaSum) * curW : curW / row.length;
        tiles.push({
          id: rItem.id,
          count: rItem.count,
          percentage: (rItem.count / totalCount) * 100,
          x: rX,
          y: curY,
          w: itemW,
          h: rowHeight,
          data: rItem.data,
        });
        rX += itemW;
      }
    } else {
      const rowWidth = curW;
      let rY = curY;
      for (const rItem of row) {
        const a = (rItem.count / totalCount) * totalArea;
        const itemH = rowAreaSum > 0 ? (a / rowAreaSum) * curH : curH / row.length;
        tiles.push({
          id: rItem.id,
          count: rItem.count,
          percentage: (rItem.count / totalCount) * 100,
          x: curX,
          y: rY,
          w: rowWidth,
          h: itemH,
          data: rItem.data,
        });
        rY += itemH;
      }
    }
  }

  return tiles;
}

/**
 * Computes a standard squarified treemap layout for length bins
 * filling the bounding box [0, width] x [0, height] with rectangles proportional to count.
 */
export function computeSquarifiedTreemap(
  items: TreemapItem[],
  width: number,
  height: number
): TreemapTile[] {
  const genericItems: GenericTreemapItem<number>[] = items.map((i) => ({
    id: String(i.length),
    count: i.count,
    data: i.length,
  }));
  const genericTiles = computeSquarifiedTreemapGeneric(genericItems, width, height);
  return genericTiles.map((t) => ({
    length: t.data ?? Number(t.id),
    count: t.count,
    percentage: t.percentage,
    x: t.x,
    y: t.y,
    w: t.w,
    h: t.h,
  }));
}
