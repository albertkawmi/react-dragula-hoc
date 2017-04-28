import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Dragula from 'react-dragula';

const DRAGGABLE_TYPE = 'dnd-draggable-type';
const DRAGGABLE_ID = 'dnd-draggable-id';
const CONTAINER_TYPE = 'dnd-container-type';
const CONTAINER_ID = 'dnd-container-id';
const CONTAINER_DIV_SCROLL_RATE = 0.2;

const DEFAULT_DIRECTION = 'vertical';
const DEFAULT_ID_PROP = 'id';

// Needs to be a global store to allow drag-drop across multiple instances
const dndStore = {};

export const dndContainer = ({
  idProp = DEFAULT_ID_PROP,
  containerType,
  acceptType, // TODO: make this an array to accept multiple types
  handleClassName,
  direction = DEFAULT_DIRECTION,
  scrollContainerAtBoundaries = false,
  containerScrollRate = CONTAINER_DIV_SCROLL_RATE
}) => (ComponentToWrap) => {
  if (!containerType) throw new Error('dndContainer must specify containerType');
  if (!acceptType) throw new Error('dndContainer must specify acceptType');
  // TODO: improve checking for valid React component?
  const isValidComponent = ['function', 'object'].includes(typeof ComponentToWrap);
  if (!isValidComponent) throw new Error('dndContainer must be applied to a valid React component');

  const WrappedComponent = ensureClassComponent(ComponentToWrap);

  if (!dndStore[containerType]) {
    dndStore[containerType] = Dragula([], {
      accepts(el, target) {
        return el.getAttribute(DRAGGABLE_TYPE) === acceptType
          && target.getAttribute(CONTAINER_TYPE) === containerType;
      },
      moves(el, source, handle) {
        if (!handleClassName) return true;
        return handle.classList.contains(handleClassName);
      },
      direction
    });
  }
  return class extends Component {
    // these are set in the rootRef method
    rootEl = null
    scrollParentHandler = null

    // pointer to the Dragula instance for this containerType
    drake = null;

    componentDidMount() {
      this.drake = dndStore[containerType];
      /**
       * NOTE:
       * any .on event handlers setup here _must_ be removed
       * in componentWillUnmount
       */
      this.drake
      .on('drop', this.onDrop)
      .on('drag', this.addScrollHandlers)
      .on('dragend', this.removeScrollHandlers);
      // TODO: expose remaining Dragula .on event handlers
    }
    onDrop = (el, target, source) => {
      if (!target || !source) return;
      if (typeof this.props.onChange !== 'function') {
        console.warn('Invalid onChange handler passed to drag-drop container component.');
        return;
      }
      const targetId = target.getAttribute(CONTAINER_ID);
      /**
       * NOTE:
       * the on 'drop' handler fires for _ALL_ containers
       * the next line prevents any further work being done for
       * unrelated containers.
       *
       * TODO: investigate if this should be further optimised
       */
      if (targetId !== this.props[idProp]) return;
      // update the list of ids in the target container
      const updatedTargetElements = getDraggableChildIds(target);
      // update the list of ids in the source container (if different to target)
      const sourceId = source.getAttribute(CONTAINER_ID);
      const updatedSourceElements = sourceId === targetId
        ? updatedTargetElements
        : getDraggableChildIds(source);

      this.props.onChange({
        source: { id: sourceId, elements: updatedSourceElements },
        target: { id: targetId, elements: updatedTargetElements }
      });
    }
    addScrollHandlers = () => {
      /**
       * Scroll parent element when dragged item is at the top or bottom.
       * This is to allow dragging within fixed-height scrolling containers.
       *
       * NOTE:
       * This is applied to every container element on the page.
       * 1000 containers => 2000 event listeners
       */
      if (this.scrollParentHandler) {
        document.addEventListener('mousemove', this.scrollParentHandler);
        document.addEventListener('touchmove', this.scrollParentHandler);
      }
    }
    removeScrollHandlers = () => {
      if (this.scrollParentHandler) {
        document.removeEventListener('mousemove', this.scrollParentHandler);
        document.removeEventListener('touchmove', this.scrollParentHandler);
      }
    }
    componentWillUnmount() {
      // remove dragula container reference
      const { containers } = dndStore[containerType];
      containers.splice(
        containers.indexOf(this.rootEl),
        1
      );
      // removeScrollHandlers in case unmounts mid-drag
      this.removeScrollHandlers();

      // remove any drake.on event handlers
      this.drake.off('drop', this.onDrop);
      if (scrollContainerAtBoundaries) {
        this.drake.off('drag', this.addScrollHandlers);
        this.drake.off('dragend', this.removeScrollHandlers);
      }
      // TODO: confirm that no further clean-up is needed
    }
    rootRef(component) {
      const el = ReactDOM.findDOMNode(component);
      if (!el) return;

      // assign container ids
      const id = this.props[idProp];
      el.setAttribute(CONTAINER_TYPE, containerType);
      el.setAttribute(CONTAINER_ID, id);

      const { containers } = dndStore[containerType];

      // save DOM reference for cleanup later
      this.rootEl = el;

      // setup container scroll handler if needed
      if (scrollContainerAtBoundaries) {
        this.scrollParentHandler = direction === 'vertical'
          ? verticalScroll(el, containerScrollRate)
          : horizontalSrcoll(el, containerScrollRate);
      }

      // add container to dndStore
      const existingIndex = containers.findIndex(
        existing => existing.getAttribute(CONTAINER_ID) === id
      );
      if (existingIndex > -1) {
        containers[existingIndex] = el;
      } else {
        containers.push(el);
      }
    }
    render() {
      return (
        <WrappedComponent
          {...this.props}
          ref={this.rootRef.bind(this)}
          key={`${containerType}-${this.props.children.length}`} />
      );
    }
  };
};

export const dndElement = ({
  idProp = 'id',
  type
}) => (ComponentToWrap) => {
  const WrappedComponent = ensureClassComponent(ComponentToWrap);

  return class extends Component {
    rootRef(component) {
      const el = ReactDOM.findDOMNode(component);
      if (!el) return;
      el.setAttribute(DRAGGABLE_ID, this.props[idProp]);
      el.setAttribute(DRAGGABLE_TYPE, type);
      this.rootEl = el;
    }
    componentWillUnmount() {
      // TODO: check this is actually needed
      if (this.rootEl) this.rootEl.remove();
    }
    render() {
      return (
        <WrappedComponent {...this.props} ref={this.rootRef.bind(this)}/>
      );
    }
  };
};

// Node -> [String]
function getDraggableChildIds(parentEl) {
  // find matching elements and map to the required attr
  const parentId = parentEl.getAttribute(CONTAINER_ID);
  const draggableChildEls = parentEl.querySelectorAll(
    // TODO: does it _have_ to be immediate children?
    `[${CONTAINER_ID}=${parentId}] > [${DRAGGABLE_ID}]`
  );
  const childIds = Array
    .from(draggableChildEls)
    .map(child => child.getAttribute(DRAGGABLE_ID));

  return childIds;
}

/**
 * This is needed so that we can attach a ref to get the root DOM node
 * for drag-and-drop purposes
 */
function ensureClassComponent(ComponentToWrap) {
  const isStateless = typeof ComponentToWrap.prototype.render !== 'function';

  return isStateless
    ? convertToClass(ComponentToWrap)
    : ComponentToWrap;
}

function convertToClass(StatelessComponent) {
  return class extends Component {
    render = () => <StatelessComponent {...this.props} />;
  };
}

// TODO: DRY up verticalScroll and horizontalScroll
function verticalScroll(parentEl, rate) {
  return (ev) => {
    const parent = parentEl;
    const height = parent.clientHeight;
    const mousePosition = ev.pageY;
    const top = parent.offsetTop;
    const bottom = top + height;
    if (mousePosition < top) {
      parent.scrollTop -= rate * (top - mousePosition);
    } else if (mousePosition > bottom) {
      parent.scrollTop += rate * (mousePosition - bottom);
    }
  };
}

function horizontalSrcoll(parentEl, rate) {
  return (ev) => {
    const parent = parentEl;
    const width = parent.clientWidth;
    const mousePosition = ev.pageX;
    const left = parent.offsetLeft;
    const right = left + width;
    if (mousePosition < left) {
      parent.scrollLeft -= rate * (left - mousePosition);
    } else if (mousePosition > right) {
      parent.scrollLeft += rate * (mousePosition - right);
    }
  };
}
