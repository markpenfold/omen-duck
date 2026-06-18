
import styles from '@/app/styles/styles.module.css';
import {SuperSimpleTestHarness} from '@/components/data/SuperSimpleTestHarness'
import OmenWrap from '@/components/data/omenWrap';

export default async function OmenPage() {


  return (
    <OmenWrap >
        <div className={styles.pageContainer}>
          <SuperSimpleTestHarness  />
        </div>
    </OmenWrap>
    );
}