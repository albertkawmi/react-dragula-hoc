# react-dragula-hoc
A higher-order React component wrapper for Dragula, drag-and-drop.

## Make a component draggable
```js
const Item = ({ id, text }) =>
  <li className="item">
    <span className="item__handle" />
    <span>{id} -> {text}</span>
  </li>

const DraggableItem = dndElement({
  type: 'item'
})(Item);
```

## Make a container that accepts draggable components
```js
const Items = ({ children }) => <ul className="list__items">{children}</ul>;

const DropItems = dndContainer({
  idProp: 'id', // <-- the prop used to uniquely identify items
  containerType: 'list',
  acceptType: 'item', // <-- this needs to match the 'type' of the DraggableItem
  handleClassName: 'item__handle',
  direction: 'vertical'
})(Items);
```

## Use the container in your app
```js
const ListOfItems = ({ listId, items, onDrop }) =>
  <DropItems id={listId} onDrop={onDrop} >
    {items.map(
      item => <Item item={item} id={item.id} key={item.id} />
    )}
  </DropItems>
```

## An example `onDrop` handler
```js
const onDrop = ({ source, target }) => {
  console.log(source.id); // the id of the source container
  console.log(target.id); // the id of the target container (can be same as source)
  console.log(source.elements); // Array of ids in the source container ["item1", "item2" ...]
  console.log(target.elements); // Array of ids in the target container

  // For example, update two lists in state where state is keyed by list ID:
  this.setState({
    [source.id]: {
      ...this.state[source.id],
      items: source.elements
    },
    [target.id]: {
      ...this.state[target.id],
      items: target.elements
    }
  });
};
```