B="danger_w=1 z_heal=0 b_stkind=1 b_wind=0 t_chain=25 t_cont=37 t_pick=41 t_blood=100"
V="$B b_cap=7 b_once=1 b_mode=count b_len=0 x_slots=3 x_slots_up= x_single=1 z_free=1 z_norep=1 y_cap=99 y_cap_up= y_nodef=1"
python3 nc_exp2.py V1_guard $V y_guard=1
python3 nc_exp2.py V2_noguard $V y_guard=0
python3 nc_exp2.py V3_len $V y_guard=0 b_len=1
python3 nc_exp2.py V4_bloodsingle $V y_guard=0 y_single=1 y_nodef=0
