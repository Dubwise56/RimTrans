import Vue, { CreateElement, VNode } from 'vue';
import {
  Component,
  Emit,
  Inject,
  Model,
  Prop,
  Provide,
  Watch,
} from 'vue-property-decorator';

/**
 * Component: PlaceHolder
 */
@Component
export default class VPlaceHolder extends Vue {
  private render(h: CreateElement): VNode {
    return <div staticClass="v-place-holder">{this.$slots.default}</div>;
  }
}
