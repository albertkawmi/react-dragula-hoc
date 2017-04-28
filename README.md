# react-dragula-hoc

_This is not production-ready. It probably contains bugs and the API will change._

A [React Higher-Order Component][1] wrapper for the [Dragula][2] drag-and-drop library.

`react-dragula-hoc` hides away the imperative details of the Dragula API and presents a more declarative API, inspired by [ReactDnD][3]. ReactDnD is extremely powerful but much more low-level.

## Install
```shell
npm install --save react-dragula-hoc
```
`react@15.x` and `react-dom@15.x` are listed as `peerDependencies` (i.e. they're expected to be in your project) but it will probably work with other versions.

## Make a component draggable
```js
import { dndElement } from 'react-dragula-hoc';

const Item = ({ text }) =>
  <li className="item">
    <span className="item__handle" />
    <span>This item has some text: {text}</span>
  </li>

const DraggableItem = dndElement({
  // name of the prop used to identify the container
  // defaults to 'id' if not specified:
  idProp: 'itemId',
  // an element with some type can only be dropped into
  // containers with a matching acceptType prop
  type: 'item'
})(Item);
```

## Make a container that accepts draggable components
```js
import { dndContainer } from 'react-dragula-hoc';

const Items = ({ children }) => <ul className="list__items">{children}</ul>;

const DropItems = dndContainer({
  // name of the prop used to identify the container
  // defaults to 'id' if not specified:
  idProp: 'listId',
  // the type of the container (any string):
  containerType: 'list',
  // the type that the container accepts (any string)
  // needs to match the 'type' of the DraggableItem
  acceptType: 'item',
  // optional, only start dragging if click is registered
  // on element with the provided className:
  handleClassName: 'item__handle',
  // optional, defaults to 'vertical'
  direction: 'vertical',
  // optional, if container is fixed height or width, dragging outside the container
  // will cause it to scroll its contents:
  scrollContainerAtBoundaries: true,
  // optional, set the speed of the scrolling (number from 0 to 1):
  containerScrollRate: 0.2
})(Items);
```

## Use the container in your app
```js
const ListOfItems = ({ listId, items, onChange }) =>
  // note: listId is specified here
  // because it is the idProp used in dndContainer
  <DropItems listId={listId} onChange={onChange} >
    {
      // render items as children inside the draggable container
      // (you could also render non-draggable things here...)
      items.map(
        // note: 'itemId' is specified here
        // because it is the idProp used in dndElement
        item => <Item item={item} itemId={item.id} key={item.id} />
      )
    }
  </DropItems>
```

## An example `onChange` handler
```js
// this fires whenever there is a drop even that results
// in a change of contents or order of contents within
// a container
const onChange = ({ source, target }) => {
  const sourceList = source.id; // the id of the source container
  const targetList = target.id; // the id of the target container (can be same as source)
  const sourceListItems = source.elements; // Array of ids in the source container ["item1", "item2" ...]
  const targetListItems = target.elements; // Array of ids in the target container

  // For example, update two lists in state (where state is keyed by list ID):
  this.setState({
    [sourceList]: {
      ...this.state[sourceList],
      items: sourceListItems
    },
    [targetList]: {
      ...this.state[targetList],
      items: targetListItems
    }
  });
};
```

## TODOs

* wrap the remaining Dragula options and events
* decide on good public API
* write unit tests
* create an example app

[1]: https://facebook.github.io/react/docs/higher-order-components.html
[2]: https://github.com/bevacqua/dragula
[3]: https://github.com/react-dnd/react-dnd
