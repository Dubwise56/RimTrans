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
import { MOTION_DURATION_2 } from '@src/renderer/components/base';

/**
 * Component: App
 */
@Component
export default class VApp extends Vue {
  private isDevelopment: boolean = process.env.NODE_ENV === 'development';

  private render(h: CreateElement): VNode {
    return (
      <div staticClass="v-app">
        <div key="app-bar" staticClass="v-app_bar">
          <rw-button size="large" skin="flat" shape="square" router-link to="/">
            {/* <md-icon staticClass="v-app_bar-icon" icon="Home" /> */}
            <rw-logo staticClass="v-app_bar-icon" />
          </rw-button>

          <rw-button
            size="large"
            skin="flat"
            shape="square"
            onClick={() => window.history.back()}
          >
            <md-icon staticClass="v-app_bar-icon" icon="ChevronLeft" />
          </rw-button>
          <rw-button
            size="large"
            skin="flat"
            shape="square"
            onClick={() => window.history.forward()}
          >
            <md-icon staticClass="v-app_bar-icon" icon="ChevronRight" />
          </rw-button>

          <i staticClass="v-app_bar-blank" />

          <rw-button size="large" skin="flat" shape="square" router-link to="/settings">
            <md-icon staticClass="v-app_bar-icon" icon="Settings" />
          </rw-button>
        </div>

        <div key="wrapper" staticClass="v-app_wrapper">
          <transition name="rw-m-rise-fall" mode="out-in" duration={MOTION_DURATION_2}>
            <router-view staticClass="v-app_container" />
          </transition>
        </div>

        {this.isDevelopment && <rw-dev-tools key="dev-tools" />}
      </div>
    );
  }
}
