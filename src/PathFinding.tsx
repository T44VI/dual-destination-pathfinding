import React, { useMemo, useState, useLayoutEffect } from "react";
import { Graph } from "@visx/network";
import { localPoint } from "@visx/event";

interface CustomNode {
  x: number;
  y: number;
  id: string;
  links: CustomLink[];
  color?: string;
}

interface CustomLink {
  source: CustomNode;
  target: CustomNode;
  costs: number[];
}

interface LinkState {
  source: string;
  target: string;
  costs: number[];
  dashed?: boolean;
}

type NodeState = {
  [id: string]: CustomNode;
};

type GraphHook = {
  graph: { nodes: CustomNode[]; links: CustomLink[] };
  addNewNode: (x: number, y: number) => void;
  addNewLink: (source: string, target: string, costs: number[]) => void;
  moveNode: (id: string, x: number, y: number) => void;
  editLink: (source: string, target: string, costs: number[]) => void;
  printState: () => void;
};

type Tool = {
  name: string;
  onChoose?: () => void;
  clickOnBlank?: (e: React.MouseEvent<SVGElement>) => void;
  clickOnNode?: (e: React.MouseEvent<SVGElement>, id: string) => void;
  mouseDownOnNode?: (e: React.MouseEvent<SVGElement>, id: string) => void;
  mouseUp?: (e: React.MouseEvent<SVGElement>) => void;
  mouseMove?: (e: React.MouseEvent<SVGElement>) => void;
  clickOnLink?: (
    e: React.MouseEvent<SVGElement>,
    source: string,
    target: string
  ) => void;
};

type QueueType = { sortValue: number; inner: CustomNode; instigator: string };

type CostObject = {
  [id: string]: { costToTarget: number; previousNode: string };
};

const nameString = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const background = "#272b4d";

const usableArea = {
  x: 600,
  y: 600,
};

const radToDeg = (rad: number) => {
  return rad * (180.0 / Math.PI);
};

const {
  links: startlinks,
  nodes: startnodes,
}: { links: LinkState[]; nodes: NodeState } = JSON.parse(
  '{"links":[{"source":"A","target":"B","costs":[4,5]},{"source":"B","target":"C","costs":[3,6]},{"source":"A","target":"C","costs":[2,3],"dashed":true},{"source":"B","target":"D","costs":[1,2]},{"source":"C","target":"E","costs":[3,4]},{"source":"E","target":"F","costs":[4,5]},{"source":"B","target":"E","costs":[5,5]},{"source":"E","target":"H","costs":[2,4]},{"source":"H","target":"F","costs":[3,5]},{"source":"F","target":"G","costs":[2,4]},{"source":"H","target":"G","costs":[3,3]},{"source":"D","target":"H","costs":[2,3]},{"source":"D","target":"E","costs":[2,3]},{"source":"I","target":"G","costs":[4,4]},{"source":"I","target":"H","costs":[2,5]},{"source":"B","target":"Q","costs":[2,4]},{"source":"D","target":"Q","costs":[3,4]},{"source":"Q","target":"P","costs":[6,9]},{"source":"Q","target":"N","costs":[5,6]},{"source":"D","target":"N","costs":[7,9]},{"source":"P","target":"N","costs":[2,2]},{"source":"P","target":"O","costs":[3,4]},{"source":"N","target":"O","costs":[2,3]},{"source":"N","target":"M","costs":[4,5]},{"source":"O","target":"M","costs":[3,5]},{"source":"M","target":"R","costs":[6,6]},{"source":"M","target":"I","costs":[7,9]},{"source":"O","target":"R","costs":[8,9]},{"source":"R","target":"L","costs":[4,7]},{"source":"M","target":"L","costs":[5,8]},{"source":"L","target":"I","costs":[5,6]},{"source":"L","target":"G","costs":[6,8]},{"source":"G","target":"K","costs":[2,3]},{"source":"K","target":"F","costs":[1,2]},{"source":"F","target":"J","costs":[2,3]},{"source":"K","target":"J","costs":[2,3]}],"nodes":{"A":{"id":"A","x":65,"y":64,"links":[]},"B":{"id":"B","x":144,"y":202,"links":[]},"C":{"id":"C","x":212,"y":31,"links":[]},"D":{"id":"D","x":205,"y":280,"links":[]},"E":{"id":"E","x":279,"y":125,"links":[]},"F":{"id":"F","x":425,"y":114,"links":[]},"G":{"id":"G","x":506,"y":246,"links":[]},"H":{"id":"H","x":360,"y":245,"links":[]},"I":{"id":"I","x":449,"y":345,"links":[]},"J":{"id":"J","x":518.703857421875,"y":40.6070556640625,"links":[]},"K":{"id":"K","x":529.7785034179688,"y":154.4298553466797,"links":[]},"L":{"id":"L","x":513.7817993164062,"y":434.9876708984375,"links":[]},"M":{"id":"M","x":343.970458984375,"y":502.6661071777344,"links":[]},"N":{"id":"N","x":214.15093994140625,"y":455.9064636230469,"links":[]},"O":{"id":"O","x":207.3831024169922,"y":549.4257202148438,"links":[]},"P":{"id":"P","x":119.4011459350586,"y":498.97454833984375,"links":[]},"Q":{"id":"Q","x":108.32649230957031,"y":337.1615905761719,"links":[]},"R":{"id":"R","x":490.4019470214844,"y":542.6578979492188,"links":[]}}}'
);

const useGraph = (): GraphHook => {
  const [nodes, setNodes] = useState<NodeState>(startnodes);
  const [links, setLinks] = useState<LinkState[]>(startlinks);
  const [nameCounter, setNameCounter] = useState(
    Object.keys(startnodes).length
  );

  const graph = useMemo(() => {
    const nodeArr = Object.keys(nodes).map((id) => nodes[id]);
    nodeArr.forEach((node) => (node.links = []));
    const linkArr = links.map((link) => ({
      ...link,
      target: nodes[link.target],
      source: nodes[link.source],
    }));
    linkArr.forEach((link) => {
      link.source.links.push(link);
      link.target.links.push(link);
    });
    return { nodes: nodeArr, links: linkArr };
  }, [nodes, links]);

  const addNewNode = (x: number, y: number) => {
    const getNewLetter = (num: number): string => {
      if (num >= nameString.length) {
        return (
          nameString[Math.floor(num / nameString.length) - 1] +
          getNewLetter(num % nameString.length)
        );
      } else {
        return nameString[num];
      }
    };

    const newObj: CustomNode = {
      id: getNewLetter(nameCounter),
      x,
      y,
      links: [],
    };

    setNodes((_nodes) => ({
      ..._nodes,
      [newObj.id]: newObj,
    }));

    setNameCounter((i) => i + 1);
  };

  const moveNode = (id: string, x: number, y: number) => {
    setNodes((_nodes) => ({ ..._nodes, [id]: { ..._nodes[id], x, y } }));
  };

  const addNewLink = (source: string, target: string, costs: number[]) =>
    setLinks((links) => [...links, { source, target, costs }]);

  const editLink = (source: string, target: string, costs: number[]) =>
    setLinks((links) =>
      links.map((link) =>
        link.source === source && link.target === target
          ? { ...link, costs }
          : link
      )
    );

  const printState = () => {
    const nodes2: { [id: string]: CustomNode } = {};
    Object.keys(nodes).forEach((nodeId) => {
      nodes2[nodeId] = { ...nodes[nodeId], links: [] };
    });
    console.log(JSON.stringify({ links, nodes: nodes2 }));
  };

  return {
    graph,
    addNewNode,
    addNewLink,
    moveNode,
    editLink,
    printState,
  };
};

const calculateCosts = (
  nodes: CustomNode[],
  costIndex: number,
  startId: string
): CostObject => {
  const queue: QueueType[] = [];

  const res: {
    [id: string]: { costToTarget: number; previousNode: string };
  } = {};

  const addToQueue = (value: QueueType) => {
    var low = 0,
      high = queue.length;

    while (low < high) {
      var mid = (low + high) >>> 1;
      if (queue[mid].sortValue < value.sortValue) low = mid + 1;
      else high = mid;
    }

    queue.splice(low, 0, value);
  };

  addToQueue({
    inner: nodes.filter((a) => a.id === startId)[0],
    sortValue: 0,
    instigator: "",
  });

  while (queue.length) {
    const current = queue.shift() as QueueType;
    if (!res[current.inner.id]) {
      res[current.inner.id] = {
        costToTarget: current.sortValue,
        previousNode: current.instigator,
      };
      current.inner.links.forEach((link) => {
        const cost = link.costs[costIndex];
        const other =
          link.source.id === current.inner.id ? link.target : link.source;
        if (!cost) return;
        addToQueue({
          sortValue: current.sortValue + cost,
          instigator: current.inner.id,
          inner: other,
        });
      });
    }
  }

  return res;
};

const getPathArray = (
  startCosts: CostObject,
  targetCosts: CostObject,
  middlePointId: string
) => {
  const route: string[] = [middlePointId];

  let currentKey = middlePointId;
  while (startCosts[currentKey].previousNode) {
    currentKey = startCosts[currentKey].previousNode;
    route.unshift(currentKey);
  }

  currentKey = middlePointId;
  while (targetCosts[currentKey].previousNode) {
    currentKey = targetCosts[currentKey].previousNode;
    route.push(currentKey);
  }

  return route;
};

const usePathfinder = (
  { nodes }: { nodes: CustomNode[]; links: CustomLink[] },
  start: string,
  targetA: string,
  targetB: string
) =>
  useMemo(() => {
    const aStartCosts = calculateCosts(nodes, 0, start);
    const aTargetCosts = calculateCosts(nodes, 0, targetA);
    const bStartCosts = calculateCosts(nodes, 1, start);
    const bTargetCosts = calculateCosts(nodes, 1, targetB);

    const totalCosts = nodes
      .filter((node) => !!aStartCosts[node.id])
      .map((node) => ({
        id: node.id,
        aStart: aStartCosts[node.id],
        aTarget: aTargetCosts[node.id],
        bStart: bStartCosts[node.id],
        bTarget: bTargetCosts[node.id],
      }))
      .map((node) => ({
        ...node,
        aRoute: node.aStart.costToTarget + node.aTarget.costToTarget,
        bRoute: node.aStart.costToTarget + node.bTarget.costToTarget,
      }))
      .map((node) => ({ ...node, total: node.aRoute + node.bRoute }))
      .sort((a, b) => a.total - b.total);

    const noSplitIndex = totalCosts.findIndex((a) => a.id === start);

    return {
      aRoute: getPathArray(aStartCosts, aTargetCosts, totalCosts[0].id),
      time: totalCosts[0].aRoute,
      otherRoutes: {
        fastest: {
          route: getPathArray(aStartCosts, bTargetCosts, totalCosts[0].id),
          time: totalCosts[0].bRoute,
          splittingPoint: totalCosts[0].id,
        },
        noSplitB: {
          route: getPathArray(
            aStartCosts,
            bTargetCosts,
            totalCosts[noSplitIndex].id
          ),
          time: totalCosts[noSplitIndex].bRoute,
          splittingPoint: start,
        },
        noSplitA: {
          route: getPathArray(aStartCosts, aTargetCosts, start),
          time: aTargetCosts[start].costToTarget,
          splittingPoint: start,
        },
      },
    };
  }, [nodes, start, targetA, targetB]);

export const PathFinding = () => {
  const graph = useGraph();
  const [tool, setTool] = useState(0);
  const [selectedNode, setSelectedNode] = useState<false | string>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState("J");
  const [targetA, setTargetA] = useState("O");
  const [targetB, setTargetB] = useState("R");
  const [isSplitted, setIsSplitted] = useState(true);
  const [sizes, setSizes] = useState({
    width: 0,
    height: 0,
    scaling: 0,
    viewBox: { start: { x: 0, y: 0 }, size: { x: 0, y: 0 } },
  });
  useLayoutEffect(() => {
    const recalculateSizes = () => {
      const width = window.innerWidth;
      const height = window.innerHeight * 0.8;

      const scaling = Math.min(width / usableArea.x, height / usableArea.y);

      const viewBox = {
        start: {
          x: -(width / scaling - usableArea.x) / 2,
          y: -(height / scaling - usableArea.y) / 2,
        },
        size: {
          x: width / scaling,
          y: height / scaling,
        },
      };

      setSizes({ width, height, scaling, viewBox });
    };
    window.addEventListener("resize", recalculateSizes);
    recalculateSizes();
    return () => window.removeEventListener("resize", recalculateSizes);
  }, []);
  const pathfinder = usePathfinder(graph.graph, startPoint, targetA, targetB);

  const tools: Tool[] = [
    {
      name: "No tool",
      clickOnBlank(e) {
        setSelectedNode(false);
      },
      clickOnNode(e, id) {
        setSelectedNode(id);
      },
    },
    {
      name: "Add new nodes",
      clickOnBlank: (e) => {
        const point = localPoint(e);
        if (!point) {
          console.log("No point found");
          return;
        }
        graph.addNewNode(point.x, point.y);
      },
      onChoose: () => {
        setSelectedNode(false);
      },
    },
    {
      name: "Add new link",
      clickOnBlank: (e) => {
        setSelectedNode(false);
      },
      clickOnNode: (e, id) => {
        if (!selectedNode) {
          setSelectedNode(id);
        } else {
          if (selectedNode === id) {
            setSelectedNode(false);
            return;
          }
          if (
            graph.graph.links.some(
              (a) =>
                (a.target.id === id && a.source.id === selectedNode) ||
                (a.target.id === selectedNode && a.source.id === id)
            )
          )
            return;
          const newWeights = window
            .prompt(
              "Input new costs (number values, . as decimal separator, separeted by ,)"
            )
            ?.split(",")
            .map((v) => Number(v.trim()));
          if (!newWeights || newWeights.some((a) => !a)) return;
          graph.addNewLink(selectedNode, id, newWeights);
          setSelectedNode(false);
        }
      },
    },
    {
      name: "Move node",
      mouseDownOnNode: (e, id) => {
        setSelectedNode(id);
        setIsDragging(true);
      },
      mouseUp: (e) => {
        if (selectedNode) {
          const point = localPoint(e);
          if (!point) return;
          graph.moveNode(selectedNode, point.x, point.y);
        }
        setSelectedNode(false);
        setIsDragging(false);
      },
      mouseMove: (e) => {
        if (isDragging) {
          if (selectedNode) {
            const point = localPoint(e);
            if (!point) return;
            graph.moveNode(selectedNode, point.x, point.y);
          }
        }
      },
    },
    {
      name: "Edit Link",
      onChoose: () => setSelectedNode(false),
      clickOnLink: (e, source, target) => {
        const newWeights = window
          .prompt(
            "Input new costs (number values, . as decimal separator, separeted by ,)"
          )
          ?.split(",")
          .map((v) => Number(v.trim()));
        if (!newWeights || newWeights.some((a) => !a)) return;
        graph.editLink(source, target, newWeights);
      },
    },
    {
      name: "Print current graph on console",
      onChoose: () => {
        graph.printState();
        setTool(0);
      },
    },
    {
      name: "Set start node",
      clickOnNode: (e, id) => {
        setStartPoint(id);
      },
      onChoose: () => {
        if (selectedNode) {
          setStartPoint(selectedNode);
          setSelectedNode(false);
        }
      },
    },
    {
      name: "Set A destination",
      clickOnNode: (e, id) => {
        setTargetA(id);
      },
      onChoose: () => {
        if (selectedNode) {
          setTargetA(selectedNode);
          setSelectedNode(false);
        }
      },
    },
    {
      name: "Set B destination",
      clickOnNode: (e, id) => {
        setTargetB(id);
      },
      onChoose: () => {
        if (selectedNode) {
          setTargetB(selectedNode);
          setSelectedNode(false);
        }
      },
    },
  ];

  const distanceToLine = 5;
  const distancePerChar = 8;

  const handleClickOnBlank = (e: React.MouseEvent<SVGElement>) => {
    if (!tools[tool] || !tools[tool].clickOnBlank) return;
    tools[tool].clickOnBlank!(e);
  };

  const handleClickOnNode =
    (id: string) => (e: React.MouseEvent<SVGElement>) => {
      if (!tools[tool] || !tools[tool].clickOnNode) return;
      tools[tool].clickOnNode!(e, id);
    };

  const handleMouseDownOnNode =
    (id: string) => (e: React.MouseEvent<SVGElement>) => {
      if (!tools[tool] || !tools[tool].mouseDownOnNode) return;
      tools[tool].mouseDownOnNode!(e, id);
    };

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (!tools[tool] || !tools[tool].mouseMove) return;
    tools[tool].mouseMove!(e);
  };

  const handleMouseUp = (e: React.MouseEvent<SVGElement>) => {
    if (!tools[tool] || !tools[tool].mouseMove) return;
    tools[tool].mouseUp!(e);
  };

  const handleToolSelect = (i: number) => () => {
    setTool(i);
    if (!tools[i] || !tools[i].onChoose) return;
    tools[i].onChoose!();
  };

  const handleClickOnLink =
    (source: string, target: string) => (e: React.MouseEvent<SVGElement>) => {
      if (!tools[tool] || !tools[tool].clickOnLink) return;
      tools[tool].clickOnLink!(e, source, target);
    };

  return sizes.width < 10 ? null : (
    <>
      <svg
        width={sizes.width}
        height={sizes.height}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        viewBox={`${sizes.viewBox.start.x} ${sizes.viewBox.start.y} ${sizes.viewBox.size.x} ${sizes.viewBox.size.y}`}
      >
        <rect
          x={sizes.viewBox.start.x}
          y={sizes.viewBox.start.y}
          width={sizes.viewBox.size.x}
          height={sizes.viewBox.size.y}
          fill={background}
          onClick={() => window.alert("You clicked outside of the usable area")}
        />
        <rect
          width={usableArea.x}
          height={usableArea.y}
          fill={background}
          onClick={handleClickOnBlank}
        />
        <Graph<CustomLink, CustomNode>
          graph={graph.graph}
          nodeComponent={({ node: { x, y, color, id } }) => {
            return (
              <g
                onClick={handleClickOnNode(id)}
                onMouseDown={handleMouseDownOnNode(id)}
              >
                <circle
                  cx={0}
                  cy={0}
                  r={20}
                  fill={
                    startPoint === id
                      ? "#3f4"
                      : targetA === id
                      ? "#f00"
                      : targetB === id
                      ? "#f50"
                      : "#da9"
                  }
                  {...(selectedNode === id
                    ? { style: { stroke: "white", strokeWidth: "5px" } }
                    : {})}
                />
                <text dominantBaseline="middle" textAnchor="middle">
                  {id}
                </text>
              </g>
            );
          }}
          linkComponent={({ link: { source, target, costs } }) => {
            const [pointA, pointB] =
              source.x > target.x ? [target, source] : [source, target];

            const angle = Math.atan(
              (pointB.y - pointA.y) / (pointB.x - pointA.x)
            );

            const textX =
              (source.x + target.x) / 2 +
              Math.sin(angle) * distanceToLine -
              Math.cos(angle) * distancePerChar * costs.length;
            const textY =
              (source.y + target.y) / 2 -
              Math.cos(angle) * distanceToLine -
              Math.sin(angle) * distancePerChar * costs.length;

            const isOnAPath = (
              isSplitted
                ? pathfinder.aRoute
                : pathfinder.otherRoutes.noSplitA.route
            ).some(
              (a, i, arr) =>
                a === target.id &&
                ((i < arr.length - 1 && arr[i + 1] === source.id) ||
                  (i > 0 && arr[i - 1] === source.id))
            );

            const isOnBPath = pathfinder.otherRoutes[
              isSplitted ? "fastest" : "noSplitB"
            ].route.some(
              (a, i, arr) =>
                a === target.id &&
                ((i < arr.length - 1 && arr[i + 1] === source.id) ||
                  (i > 0 && arr[i - 1] === source.id))
            );

            const transform = `rotate(${radToDeg(angle)}, ${textX},${textY})`;

            return (
              <>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  strokeWidth={isOnAPath || isOnBPath ? 3 : 2}
                  stroke={isOnAPath ? "#fff" : isOnBPath ? "#ff0" : "#999"}
                  strokeOpacity={0.9}
                />
                <text
                  onClick={handleClickOnLink(source.id, target.id)}
                  x={textX}
                  y={textY}
                  transform={transform}
                  fill="#fff"
                >
                  {costs.join(" | ")}
                </text>
              </>
            );
          }}
        />
      </svg>
      <div className="tools">
        {tools.map((t, i) => (
          <button
            key={t.name}
            disabled={i === tool}
            onClick={handleToolSelect(i)}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="pathfinding">
        <div
          className={`pathfindingUnit ${isSplitted ? "selected" : ""}`}
          onClick={() => setIsSplitted(true)}
        >
          <h3>With split on {pathfinder.otherRoutes.fastest.splittingPoint}</h3>
          <p>
            Route of agent A:
            {pathfinder.aRoute.join(", ")}, cost: {pathfinder.time}
          </p>
          <p>
            Route of agent B: {pathfinder.otherRoutes.fastest.route.join(", ")},
            cost: {pathfinder.otherRoutes.fastest.time}
          </p>
        </div>
        <div
          className={`pathfindingUnit ${isSplitted ? "" : "selected"}`}
          onClick={() => setIsSplitted(false)}
        >
          <h3>Without split</h3>
          <p>
            Route of agent A: {pathfinder.otherRoutes.noSplitA.route.join(", ")}
            , cost: {pathfinder.otherRoutes.noSplitA.time}
          </p>
          <p>
            Route of agent B: {pathfinder.otherRoutes.noSplitB.route.join(", ")}
            , cost: {pathfinder.otherRoutes.noSplitB.time}
          </p>
        </div>
      </div>
    </>
  );
};
